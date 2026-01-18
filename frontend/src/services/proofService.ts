/**
 * Proof Service for Private DAO Voting
 *
 * This service handles ZK proof generation for private voting.
 * Uses Noir circuits with the Barretenberg backend for real proof generation.
 *
 * IMPORTANT: Barretenberg is dynamically imported to avoid bundling the large
 * WASM at build time, which causes OOM errors on CI/CD platforms.
 */

import { poseidon2 } from 'poseidon-lite';

// Type definitions for dynamically imported modules
type NoirType = InstanceType<typeof import('@noir-lang/noir_js').Noir>;
type BarretenbergBackendType = InstanceType<typeof import('@noir-lang/backend_barretenberg').BarretenbergBackend>;
type ProofDataType = import('@noir-lang/backend_barretenberg').ProofData;

// Merkle tree depth (matches circuit)
const TREE_DEPTH = 20;

// Circuit loading
let circuitPromise: Promise<object> | null = null;
let noirInstance: NoirType | null = null;
let backendInstance: BarretenbergBackendType | null = null;

/**
 * Poseidon hash using poseidon-lite (browser-compatible)
 */
function poseidonHash(a: bigint, b: bigint): bigint {
  return poseidon2([a, b]);
}

/**
 * Load the compiled Noir circuit
 */
async function loadCircuit(): Promise<object> {
  if (!circuitPromise) {
    circuitPromise = fetch('/circuits/private_vote.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load circuit');
        return res.json();
      });
  }
  return circuitPromise;
}

/**
 * Initialize Noir with Barretenberg backend
 * Uses dynamic imports to avoid bundling large WASM at build time
 */
async function initNoir(): Promise<{ noir: NoirType; backend: BarretenbergBackendType }> {
  if (noirInstance && backendInstance) {
    return { noir: noirInstance, backend: backendInstance };
  }

  // Dynamic imports - these load at runtime, not build time
  const [{ Noir }, { BarretenbergBackend }] = await Promise.all([
    import('@noir-lang/noir_js'),
    import('@noir-lang/backend_barretenberg'),
  ]);

  const circuit = await loadCircuit();

  // Create Barretenberg backend for Groth16 proofs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  backendInstance = new BarretenbergBackend(circuit as any);

  // Create Noir instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  noirInstance = new Noir(circuit as any);

  return { noir: noirInstance, backend: backendInstance };
}

// Convert string secret to Field element
function secretToField(secret: string): bigint {
  let hash = BigInt(0);
  for (let i = 0; i < secret.length; i++) {
    hash = (hash * BigInt(256) + BigInt(secret.charCodeAt(i))) % (BigInt(2) ** BigInt(254));
  }
  return hash;
}

// Compute leaf commitment: hash(secret, secret)
function computeLeaf(secret: bigint): bigint {
  return poseidonHash(secret, secret);
}

// Compute nullifier: hash(secret, proposal_id)
function computeNullifier(secret: bigint, proposalId: bigint): bigint {
  return poseidonHash(secret, proposalId);
}

// Build a merkle tree with one voter at leftmost position (for demo)
// In production, this would use actual voter list
function buildMerkleTree(leaf: bigint): {
  root: bigint;
  siblings: bigint[];
  pathIndices: number[];
} {
  const siblings: bigint[] = new Array(TREE_DEPTH).fill(BigInt(0));
  const pathIndices: number[] = new Array(TREE_DEPTH).fill(0);

  // Compute root by hashing up the tree (leftmost position = all zeros for path)
  let current = leaf;
  for (let i = 0; i < TREE_DEPTH; i++) {
    current = poseidonHash(current, siblings[i]);
  }

  return { root: current, siblings, pathIndices };
}

// Format bigint as hex string
function toHex(value: bigint): string {
  return '0x' + value.toString(16).padStart(64, '0');
}

// Convert bigint to bytes32
function bigintToBytes32(n: bigint): Uint8Array {
  const hex = n.toString(16).padStart(64, '0');
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export interface ProofInputs {
  voterSecret: string;
  proposalId: number;
  vote: boolean; // true = yes, false = no
}

export interface ProofResult {
  success: boolean;
  proof?: {
    hex: string;
    bytes: Uint8Array;
    publicInputs: {
      votersRoot: string;
      nullifier: string;
      proposalId: string;
      vote: string;
    };
    nullifierBytes: Uint8Array;
  };
  error?: string;
  timing?: {
    inputsMs: number;
    witnessMs: number;
    provingMs: number;
    totalMs: number;
  };
}

export interface ProofProgressCallback {
  (stage: string, message: string, progress: number): void;
}

/**
 * Generate a ZK proof for a private vote
 *
 * This uses real Noir WASM to generate Groth16 proofs in the browser.
 */
export async function generateVoteProof(
  inputs: ProofInputs,
  onProgress?: ProofProgressCallback
): Promise<ProofResult> {
  const startTime = performance.now();
  let inputsMs = 0;
  let witnessMs = 0;
  let provingMs = 0;

  try {
    // Stage 1: Initialize Noir and compute circuit inputs
    onProgress?.('computing_inputs', 'Initializing ZK proving system...', 0);

    const { noir, backend } = await initNoir();

    onProgress?.('computing_inputs', 'Computing merkle proof inputs...', 10);

    const secret = secretToField(inputs.voterSecret);
    const proposalId = BigInt(inputs.proposalId);
    const vote = inputs.vote ? BigInt(1) : BigInt(0);

    // Compute cryptographic commitments using real Poseidon
    const leaf = computeLeaf(secret);
    const nullifier = computeNullifier(secret, proposalId);
    const { root: votersRoot, siblings, pathIndices } = buildMerkleTree(leaf);

    // Prepare circuit inputs in the format Noir expects
    const circuitInputs = {
      voters_root: votersRoot.toString(),
      nullifier: nullifier.toString(),
      proposal_id: proposalId.toString(),
      vote: vote.toString(),
      secret: secret.toString(),
      path_indices: pathIndices,
      siblings: siblings.map(s => s.toString()),
    };

    inputsMs = performance.now() - startTime;
    onProgress?.('computing_inputs', 'Merkle proof inputs computed', 20);

    // Stage 2: Generate witness
    onProgress?.('generating_witness', 'Generating circuit witness...', 20);
    const witnessStart = performance.now();

    // Execute the circuit to generate witness
    const { witness } = await noir.execute(circuitInputs);

    witnessMs = performance.now() - witnessStart;
    onProgress?.('generating_witness', 'Witness generated', 40);

    // Stage 3: Generate Groth16 proof
    onProgress?.('proving', 'Generating Groth16 proof (this takes a moment)...', 40);
    const provingStart = performance.now();

    // Generate the actual proof using Barretenberg
    const proofData: ProofDataType = await backend.generateProof(witness);

    provingMs = performance.now() - provingStart;
    onProgress?.('proving', 'Proof generated', 80);

    // Stage 4: Verify locally
    onProgress?.('verifying', 'Verifying proof locally...', 80);

    const isValid = await backend.verifyProof(proofData);

    if (!isValid) {
      throw new Error('Proof verification failed');
    }

    onProgress?.('verifying', 'Proof verified', 100);

    const totalMs = performance.now() - startTime;

    // Convert proof to hex string
    const proofHex = '0x' + Array.from(proofData.proof).map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      success: true,
      proof: {
        hex: proofHex,
        bytes: proofData.proof,
        publicInputs: {
          votersRoot: toHex(votersRoot),
          nullifier: toHex(nullifier),
          proposalId: inputs.proposalId.toString(),
          vote: inputs.vote ? '1' : '0',
        },
        nullifierBytes: bigintToBytes32(nullifier),
      },
      timing: {
        inputsMs: Math.round(inputsMs),
        witnessMs: Math.round(witnessMs),
        provingMs: Math.round(provingMs),
        totalMs: Math.round(totalMs),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during proof generation',
    };
  }
}

/**
 * Verify a proof using Barretenberg
 */
export async function verifyProof(
  proofBytes: Uint8Array,
  publicInputs: string[]
): Promise<boolean> {
  try {
    const { backend } = await initNoir();

    const proofData: ProofDataType = {
      proof: proofBytes,
      publicInputs: publicInputs,
    };

    return await backend.verifyProof(proofData);
  } catch {
    return false;
  }
}

// Export crypto utilities for use in components
export const CryptoUtils = {
  secretToField,
  computeLeaf,
  computeNullifier,
  buildMerkleTree,
  toHex,
  bigintToBytes32,
  poseidonHash,
};
