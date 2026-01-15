import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { buildPoseidon, Poseidon } from "circomlibjs";

const CIRCUIT_DIR = path.join(process.cwd(), "..", "circuits", "private_vote");
const TREE_DEPTH = 20;
const NARGO_PATH = path.join(process.env.HOME!, ".nargo", "bin", "nargo");
const SUNSPOT_PATH = path.join(process.env.HOME!, "sunspot", "go", "sunspot");

let poseidon: Poseidon;

export async function initPoseidon(): Promise<void> {
  poseidon = await buildPoseidon();
}

export function hashTwo(a: bigint, b: bigint): bigint {
  return BigInt(poseidon.F.toString(poseidon([a, b])));
}

export function computeLeaf(secret: bigint): bigint {
  return hashTwo(secret, secret);
}

export function computeNullifier(secret: bigint, proposalId: bigint): bigint {
  return hashTwo(secret, proposalId);
}

export function computeMerkleRoot(
  leaf: bigint,
  pathIndices: number[],
  siblings: bigint[]
): bigint {
  let current = leaf;
  for (let i = 0; i < TREE_DEPTH; i++) {
    const sibling = siblings[i];
    const isRight = pathIndices[i];
    if (isRight === 0) {
      current = hashTwo(current, sibling);
    } else {
      current = hashTwo(sibling, current);
    }
  }
  return current;
}

export interface VoteInputs {
  secret: bigint;
  proposalId: bigint;
  vote: number;
  pathIndices: number[];
  siblings: bigint[];
  votersRoot: bigint;
}

export interface ProofResult {
  proof: Buffer;
  publicWitness: Buffer;
  nullifier: bigint;
}

function writeProverToml(inputs: VoteInputs): void {
  const nullifier = computeNullifier(inputs.secret, inputs.proposalId);

  const toml = `# Generated vote proof inputs
secret = "${inputs.secret}"
proposal_id = "${inputs.proposalId}"
vote = "${inputs.vote}"
nullifier = "${nullifier}"
voters_root = "${inputs.votersRoot}"
path_indices = [${inputs.pathIndices.join(", ")}]
siblings = [${inputs.siblings.map(s => `"${s}"`).join(", ")}]
`;

  fs.writeFileSync(path.join(CIRCUIT_DIR, "Prover.toml"), toml);
}

export function generateProof(inputs: VoteInputs): ProofResult {
  // Compute the nullifier
  const nullifier = computeNullifier(inputs.secret, inputs.proposalId);

  // Write the Prover.toml
  writeProverToml(inputs);

  // Generate witness with nargo execute
  console.log("Generating witness...");
  execSync(`${NARGO_PATH} execute`, {
    cwd: CIRCUIT_DIR,
    stdio: "pipe",
  });

  // Generate Groth16 proof with sunspot
  console.log("Generating Groth16 proof...");
  const targetDir = path.join(CIRCUIT_DIR, "target");
  execSync(
    `${SUNSPOT_PATH} prove ${targetDir}/private_vote.json ${targetDir}/private_vote.gz ${targetDir}/private_vote.ccs ${targetDir}/private_vote.pk`,
    {
      cwd: CIRCUIT_DIR,
      stdio: "pipe",
    }
  );

  // Read the proof files
  const proof = fs.readFileSync(path.join(targetDir, "private_vote.proof"));
  const publicWitness = fs.readFileSync(path.join(targetDir, "private_vote.pw"));

  console.log(`Proof generated: ${proof.length} bytes`);
  console.log(`Public witness: ${publicWitness.length} bytes`);

  return { proof, publicWitness, nullifier };
}

export function bigintToBytes32(n: bigint): Uint8Array {
  const hex = n.toString(16).padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytes32ToBigint(bytes: Uint8Array): bigint {
  let hex = "0x";
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, "0");
  }
  return BigInt(hex);
}
