import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  initPoseidon,
  computeLeaf,
  computeMerkleRoot,
  computeNullifier,
  generateProof,
  bigintToBytes32,
  type VoteInputs,
} from "./proof.js";
import fs from "fs";
import path from "path";

const PROGRAM_ID = new PublicKey("AjHU1SCz7m4U5UgHW6bopAUTXFPupKYa4VrjsjK95SPX");
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const TREE_DEPTH = 20;

// Anchor discriminator for "cast_vote"
// sha256("global:cast_vote")[0..8] = 14d40fbd45b44597
const CAST_VOTE_DISCRIMINATOR = Buffer.from([0x14, 0xd4, 0x0f, 0xbd, 0x45, 0xb4, 0x45, 0x97]);

function serializeCastVote(
  nullifier: Uint8Array,
  vote: number,
  proofData: Buffer
): Buffer {
  const writer = Buffer.alloc(8 + 32 + 1 + 4 + proofData.length);
  let offset = 0;

  // Write discriminator
  CAST_VOTE_DISCRIMINATOR.copy(writer, offset);
  offset += 8;

  // Write nullifier ([u8; 32])
  Buffer.from(nullifier).copy(writer, offset);
  offset += 32;

  // Write vote (u8)
  writer.writeUInt8(vote, offset);
  offset += 1;

  // Write proof_data (Vec<u8> = u32 len + bytes)
  writer.writeUInt32LE(proofData.length, offset);
  offset += 4;
  proofData.copy(writer, offset);
  offset += proofData.length;

  return writer.subarray(0, offset);
}

async function main() {
  await initPoseidon();

  // Parse args
  const args = process.argv.slice(2);
  const proposalId = BigInt(args[0] || "1");
  const vote = parseInt(args[1] || "1", 10); // 0 = NO, 1 = YES
  const voterSecret = BigInt(args[2] || "12345");

  console.log("Casting private vote...");
  console.log(`Proposal ID: ${proposalId}`);
  console.log(`Vote: ${vote === 1 ? "YES" : "NO"}`);

  // Load wallet
  const walletPath = process.env.WALLET_PATH || path.join(process.env.HOME!, ".config/solana/id.json");
  const keypairData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log(`\nWallet: ${wallet.publicKey.toBase58()}`);
  console.log(`Program: ${PROGRAM_ID.toBase58()}`);

  // Connect to Solana
  const connection = new Connection(RPC_URL, "confirmed");

  // Compute voter proof inputs
  // For demo: single voter at leftmost position
  const pathIndices = Array(TREE_DEPTH).fill(0);
  const siblings: bigint[] = Array(TREE_DEPTH).fill(BigInt(0));
  const leaf = computeLeaf(voterSecret);
  const votersRoot = computeMerkleRoot(leaf, pathIndices, siblings);

  console.log(`\nVoters Root: ${votersRoot}`);

  // Generate ZK proof
  console.log("\nGenerating ZK proof (this may take a moment)...");
  const inputs: VoteInputs = {
    secret: voterSecret,
    proposalId,
    vote,
    pathIndices,
    siblings,
    votersRoot,
  };

  const proofResult = generateProof(inputs);
  const nullifier = proofResult.nullifier;

  console.log(`Nullifier: ${nullifier}`);

  // Derive PDAs
  const proposalIdBytes = Buffer.alloc(8);
  proposalIdBytes.writeBigUInt64LE(proposalId);
  const [proposalPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("proposal"), proposalIdBytes],
    PROGRAM_ID
  );

  const nullifierBytes = bigintToBytes32(nullifier);
  const [nullifierPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("nullifier"), proposalPda.toBuffer(), Buffer.from(nullifierBytes)],
    PROGRAM_ID
  );

  console.log(`\nProposal PDA: ${proposalPda.toBase58()}`);
  console.log(`Nullifier PDA: ${nullifierPda.toBase58()}`);

  // Combine proof + public witness for instruction data
  const proofData = Buffer.concat([proofResult.proof, proofResult.publicWitness]);
  console.log(`\nProof data size: ${proofData.length} bytes`);

  // Build instruction
  const data = serializeCastVote(nullifierBytes, vote, proofData);
  console.log(`Instruction data size: ${data.length} bytes`);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: proposalPda, isSigner: false, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
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

    console.log(`\n✅ Vote cast successfully!`);
    console.log(`Transaction: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  } catch (err: any) {
    console.error("\n❌ Failed to cast vote:", err.message || err);
    if (err.logs) {
      console.error("\nProgram logs:");
      err.logs.forEach((log: string) => console.error(`  ${log}`));
    }
    if (err.message?.includes("already in use")) {
      console.error("\nThis nullifier has already been used - you cannot vote twice!");
    }
    process.exit(1);
  }
}

main();
