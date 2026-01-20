/**
 * Solana Service for Private DAO Voting
 *
 * Handles RPC communication with Solana devnet for fetching
 * proposals and submitting vote transactions.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import BN from 'bn.js';
import { PROGRAM_ID, RPC_ENDPOINT } from '../lib/constants';
import type { Proposal } from '../types';

// Anchor discriminators (first 8 bytes of sha256("global:method_name"))
const CAST_VOTE_DISCRIMINATOR = Buffer.from([21, 45, 147, 165, 239, 63, 155, 127]);

// Account sizes
const PROPOSAL_ACCOUNT_SIZE = 8 + // discriminator
  8 + // proposal_id
  32 + // voters_root
  32 + // authority
  (4 + 64) + // title (string with max 64)
  (4 + 256) + // description (string with max 256)
  8 + // yes_votes
  8 + // no_votes
  8 + // voting_ends_at
  1 + // is_finalized
  1;  // bump

// Connection singleton
let connectionInstance: Connection | null = null;

/**
 * Get Solana connection
 * Uses Helius/Quicknode if API keys provided, falls back to public RPC
 */
export function getConnection(): Connection {
  if (!connectionInstance) {
    connectionInstance = new Connection(RPC_ENDPOINT, 'confirmed');
  }
  return connectionInstance;
}

/**
 * Derive proposal PDA
 */
export function getProposalPda(proposalId: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('proposal'), new BN(proposalId).toArrayLike(Buffer, 'le', 8)],
    new PublicKey(PROGRAM_ID)
  );
}

/**
 * Derive nullifier PDA
 */
export function getNullifierPda(nullifierBytes: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('nullifier'), Buffer.from(nullifierBytes)],
    new PublicKey(PROGRAM_ID)
  );
}

/**
 * Deserialize a proposal from account data
 */
function deserializeProposal(data: Buffer, pubkey: PublicKey): Proposal | null {
  try {
    // Skip 8-byte discriminator
    let offset = 8;

    // proposal_id (u64)
    const proposalId = new BN(data.slice(offset, offset + 8), 'le').toNumber();
    offset += 8;

    // voters_root ([u8; 32])
    const votersRoot = '0x' + data.slice(offset, offset + 32).toString('hex');
    offset += 32;

    // authority (Pubkey)
    const authority = new PublicKey(data.slice(offset, offset + 32)).toBase58();
    offset += 32;

    // title (String - 4 byte length + content)
    const titleLen = data.readUInt32LE(offset);
    offset += 4;
    const title = data.slice(offset, offset + titleLen).toString('utf8');
    offset += titleLen;

    // description (String - 4 byte length + content)
    const descLen = data.readUInt32LE(offset);
    offset += 4;
    const description = data.slice(offset, offset + descLen).toString('utf8');
    offset += descLen;

    // yes_votes (u64)
    const yesVotes = new BN(data.slice(offset, offset + 8), 'le').toNumber();
    offset += 8;

    // no_votes (u64)
    const noVotes = new BN(data.slice(offset, offset + 8), 'le').toNumber();
    offset += 8;

    // voting_ends_at (i64)
    const votingEndsAt = new BN(data.slice(offset, offset + 8), 'le').toNumber() * 1000; // Convert to ms
    offset += 8;

    // is_finalized (bool)
    const isFinalized = data[offset] === 1;
    offset += 1;

    // Skip bump
    // offset += 1;

    // For backwards compatibility, we derive multi-choice fields from legacy yes/no votes
    // In the future, on-chain proposals will store numOptions and voteCounts directly
    return {
      id: proposalId,
      title,
      description,
      authority,
      votersRoot,
      numOptions: 2, // Legacy proposals are binary
      voteCounts: [noVotes, yesVotes], // [Reject, Approve]
      optionLabels: ['Reject', 'Approve'], // Default binary labels
      yesVotes,
      noVotes,
      votingEndsAt,
      isFinalized,
      createdAt: Date.now() - 86400000, // Approximate, not stored on-chain
      pubkey: pubkey.toBase58(),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch all proposals from chain
 */
export async function fetchProposals(): Promise<Proposal[]> {
  const connection = getConnection();
  const programId = new PublicKey(PROGRAM_ID);

  try {
    // Get all program accounts
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [
        // Filter by approximate size (allow for string length variation)
        { dataSize: PROPOSAL_ACCOUNT_SIZE },
      ],
    });

    const proposals: Proposal[] = [];
    for (const { pubkey, account } of accounts) {
      const proposal = deserializeProposal(Buffer.from(account.data), pubkey);
      if (proposal) {
        proposals.push(proposal);
      }
    }

    // Sort by ID
    proposals.sort((a, b) => a.id - b.id);

    return proposals;
  } catch {
    return [];
  }
}

/**
 * Fetch a single proposal by ID
 */
export async function fetchProposal(proposalId: number): Promise<Proposal | null> {
  const connection = getConnection();
  const [proposalPda] = getProposalPda(proposalId);

  try {
    const accountInfo = await connection.getAccountInfo(proposalPda);

    if (!accountInfo) {
      return null;
    }

    return deserializeProposal(Buffer.from(accountInfo.data), proposalPda);
  } catch {
    return null;
  }
}

/**
 * Build a cast_vote transaction instruction
 */
export function buildCastVoteInstruction(
  voter: PublicKey,
  proposalId: number,
  vote: number,
  nullifierBytes: Uint8Array,
  proofBytes: Uint8Array
): TransactionInstruction {
  const [proposalPda] = getProposalPda(proposalId);
  const [nullifierPda] = getNullifierPda(nullifierBytes);

  // Serialize instruction data
  const data = Buffer.concat([
    CAST_VOTE_DISCRIMINATOR,
    new BN(proposalId).toArrayLike(Buffer, 'le', 8),
    Buffer.from([vote]),
    Buffer.from(nullifierBytes),
    Buffer.from(proofBytes),
  ]);

  return new TransactionInstruction({
    programId: new PublicKey(PROGRAM_ID),
    keys: [
      { pubkey: proposalPda, isSigner: false, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: voter, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Create and send a vote transaction
 * @param vote - Vote option index (0 to numOptions-1)
 */
export async function submitVoteTransaction(
  voter: PublicKey,
  proposalId: number,
  vote: number, // Changed from boolean to number for multi-choice support
  nullifierBytes: Uint8Array,
  proofBytes: Uint8Array,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const connection = getConnection();

  // Build the instruction
  const instruction = buildCastVoteInstruction(
    voter,
    proposalId,
    vote, // Pass vote option index directly
    nullifierBytes,
    proofBytes
  );

  // Create transaction
  const transaction = new Transaction().add(instruction);

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = voter;

  // Sign transaction (via wallet adapter)
  const signedTx = await signTransaction(transaction);

  // Send and confirm
  const signature = await connection.sendRawTransaction(signedTx.serialize());

  // Wait for confirmation
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });

  return signature;
}

/**
 * Check if a nullifier has been used
 */
export async function isNullifierUsed(nullifierBytes: Uint8Array): Promise<boolean> {
  const connection = getConnection();
  const [nullifierPda] = getNullifierPda(nullifierBytes);

  try {
    const accountInfo = await connection.getAccountInfo(nullifierPda);
    return accountInfo !== null;
  } catch {
    return false;
  }
}

/**
 * Get Solana Explorer URL for a transaction
 */
export function getExplorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}
