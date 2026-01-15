import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";
import * as borsh from "borsh";
import { initPoseidon, computeLeaf, computeMerkleRoot, bigintToBytes32 } from "./proof.js";
import fs from "fs";
import path from "path";

const PROGRAM_ID = new PublicKey("AjHU1SCz7m4U5UgHW6bopAUTXFPupKYa4VrjsjK95SPX");
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const TREE_DEPTH = 20;

// Anchor discriminator for "create_proposal"
// sha256("global:create_proposal")[0..8]
const CREATE_PROPOSAL_DISCRIMINATOR = Buffer.from([132, 116, 68, 174, 216, 160, 198, 22]);

function serializeCreateProposal(
  proposalId: bigint,
  votersRoot: Uint8Array,
  title: string,
  description: string,
  votingEndsAt: bigint
): Buffer {
  const writer = Buffer.alloc(1024);
  let offset = 0;

  // Write discriminator
  CREATE_PROPOSAL_DISCRIMINATOR.copy(writer, offset);
  offset += 8;

  // Write proposal_id (u64 LE)
  const proposalIdBuf = Buffer.alloc(8);
  proposalIdBuf.writeBigUInt64LE(proposalId);
  proposalIdBuf.copy(writer, offset);
  offset += 8;

  // Write voters_root ([u8; 32])
  Buffer.from(votersRoot).copy(writer, offset);
  offset += 32;

  // Write title (string = u32 len + bytes)
  const titleBuf = Buffer.from(title, "utf8");
  writer.writeUInt32LE(titleBuf.length, offset);
  offset += 4;
  titleBuf.copy(writer, offset);
  offset += titleBuf.length;

  // Write description (string)
  const descBuf = Buffer.from(description, "utf8");
  writer.writeUInt32LE(descBuf.length, offset);
  offset += 4;
  descBuf.copy(writer, offset);
  offset += descBuf.length;

  // Write voting_ends_at (i64 LE)
  const endsBuf = Buffer.alloc(8);
  endsBuf.writeBigInt64LE(votingEndsAt);
  endsBuf.copy(writer, offset);
  offset += 8;

  return writer.subarray(0, offset);
}

async function main() {
  await initPoseidon();

  // Load wallet
  const walletPath = process.env.WALLET_PATH || path.join(process.env.HOME!, ".config/solana/id.json");
  const keypairData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log("Creating proposal...");
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
  console.log(`Program: ${PROGRAM_ID.toBase58()}`);
  console.log(`RPC: ${RPC_URL}`);

  // Connect to Solana
  const connection = new Connection(RPC_URL, "confirmed");

  // Create a voter list (for demo, single voter with secret 12345)
  const voterSecrets = [BigInt(12345)];
  const leaves = voterSecrets.map(s => computeLeaf(s));

  // Compute merkle root (all zero siblings for single voter at leftmost position)
  const pathIndices = Array(TREE_DEPTH).fill(0);
  const siblings = Array(TREE_DEPTH).fill(BigInt(0));
  const votersRoot = computeMerkleRoot(leaves[0], pathIndices, siblings);

  console.log(`\nVoters Root: ${votersRoot}`);

  // Proposal details - accept ID from command line
  const proposalId = BigInt(process.argv[2] || "2");
  const title = process.argv[3] || "Community Grant Program";
  const description = process.argv[4] || "Fund developer grants with 500 SOL";
  const votingEndsAt = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

  // Derive proposal PDA
  const proposalIdBytes = Buffer.alloc(8);
  proposalIdBytes.writeBigUInt64LE(proposalId);
  const [proposalPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("proposal"), proposalIdBytes],
    PROGRAM_ID
  );

  console.log(`\nProposal PDA: ${proposalPda.toBase58()}`);

  // Build instruction data
  const data = serializeCreateProposal(
    proposalId,
    bigintToBytes32(votersRoot),
    title,
    description,
    votingEndsAt
  );

  console.log(`Instruction data: ${data.length} bytes`);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: proposalPda, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });

  try {
    const latestBlockhash = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [instruction],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    tx.sign([wallet]);

    const sig = await connection.sendTransaction(tx, { skipPreflight: false });
    await connection.confirmTransaction({
      signature: sig,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    console.log(`\n✅ Proposal created!`);
    console.log(`Transaction: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
    console.log(`\nProposal ID: ${proposalId}`);
    console.log(`Title: ${title}`);
    console.log(`Voting ends: ${new Date(Number(votingEndsAt) * 1000).toISOString()}`);
  } catch (err: any) {
    console.error("\n❌ Failed to create proposal:", err);
    if (err.logs) {
      console.error("\nProgram logs:");
      err.logs.forEach((log: string) => console.error(`  ${log}`));
    }
    process.exit(1);
  }
}

main();
