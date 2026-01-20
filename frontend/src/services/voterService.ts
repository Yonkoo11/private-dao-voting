/**
 * Voter Service - Fetch and compute merkle proofs for voters
 *
 * This service handles voter eligibility checking and merkle proof generation
 * for the frontend. It uses the poseidon-lite library for hash computation.
 */

import { poseidon2 } from 'poseidon-lite';

const TREE_DEPTH = 20;

// Poseidon hash using poseidon-lite (browser-compatible)
function poseidonHash(a: bigint, b: bigint): bigint {
  return poseidon2([a, b]);
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

export interface VoterRegistryData {
  proposalId: number;
  voters: {
    commitment: string;
    index: number;
  }[];
  treeDepth: number;
}

export interface MerkleProofResult {
  success: boolean;
  proof?: {
    votersRoot: string;
    siblings: string[];
    pathIndices: number[];
    leaf: string;
    index: number;
  };
  error?: string;
}

/**
 * Compute merkle root from a list of leaf commitments
 */
function computeMerkleRoot(leaves: bigint[]): bigint {
  if (leaves.length === 0) {
    // Empty tree has all-zero root
    let current = BigInt(0);
    for (let i = 0; i < TREE_DEPTH; i++) {
      current = poseidonHash(current, BigInt(0));
    }
    return current;
  }

  // Pad leaves to next power of 2
  const numLeaves = Math.pow(2, Math.ceil(Math.log2(Math.max(leaves.length, 1))));
  const paddedLeaves = [...leaves];
  while (paddedLeaves.length < numLeaves) {
    paddedLeaves.push(BigInt(0));
  }

  // Build the tree level by level
  let currentLevel = paddedLeaves;

  for (let depth = 0; depth < TREE_DEPTH; depth++) {
    const nextLevel: bigint[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] ?? BigInt(0);
      nextLevel.push(poseidonHash(left, right));
    }
    currentLevel = nextLevel;

    if (currentLevel.length === 1) {
      let root = currentLevel[0];
      for (let j = depth + 1; j < TREE_DEPTH; j++) {
        root = poseidonHash(root, BigInt(0));
      }
      return root;
    }
  }

  return currentLevel[0];
}

/**
 * Compute merkle proof for a voter at given index
 */
function computeMerkleProof(
  leaves: bigint[],
  index: number
): { root: bigint; siblings: bigint[]; pathIndices: number[] } {
  const siblings: bigint[] = [];
  const pathIndices: number[] = [];

  // Pad leaves to next power of 2
  const numLeaves = Math.pow(2, Math.ceil(Math.log2(Math.max(leaves.length, 1))));
  const paddedLeaves = [...leaves];
  while (paddedLeaves.length < numLeaves) {
    paddedLeaves.push(BigInt(0));
  }

  let currentLevel = paddedLeaves;
  let currentIndex = index;

  for (let depth = 0; depth < TREE_DEPTH; depth++) {
    const isRight = currentIndex % 2;
    pathIndices.push(isRight);

    const siblingIndex = isRight === 0 ? currentIndex + 1 : currentIndex - 1;
    const sibling = siblingIndex < currentLevel.length ? currentLevel[siblingIndex] : BigInt(0);
    siblings.push(sibling);

    const nextLevel: bigint[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] ?? BigInt(0);
      nextLevel.push(poseidonHash(left, right));
    }

    if (nextLevel.length === 0 || currentLevel.length === 1) {
      for (let j = depth + 1; j < TREE_DEPTH; j++) {
        siblings.push(BigInt(0));
        pathIndices.push(0);
      }
      break;
    }

    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);

    if (currentLevel.length === 1) {
      for (let j = depth + 1; j < TREE_DEPTH; j++) {
        siblings.push(BigInt(0));
        pathIndices.push(0);
      }
      break;
    }
  }

  const root = computeMerkleRoot(leaves);
  return { root, siblings, pathIndices };
}

/**
 * Format bigint as hex string
 */
function toHex(n: bigint): string {
  return '0x' + n.toString(16).padStart(64, '0');
}

/**
 * Try to fetch voter registry data for a proposal
 * This attempts to fetch from multiple sources:
 * 1. Local API endpoint (if running with backend)
 * 2. Static JSON file (for demo)
 */
export async function fetchVoterRegistry(proposalId: number): Promise<VoterRegistryData | null> {
  // Try fetching from local API first
  try {
    const response = await fetch(`/api/voters/${proposalId}`);
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // API not available, continue
  }

  // Try static JSON file
  try {
    const response = await fetch(`/data/proposal_${proposalId}_voters.json`);
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // File not available
  }

  return null;
}

/**
 * Get merkle proof for a voter by their secret
 *
 * This can work in two modes:
 * 1. With voter registry data - validates against actual registered voters
 * 2. Without registry data - uses demo mode (single voter tree)
 */
export async function getMerkleProofForVoter(
  secret: string,
  proposalId: number,
  registryData?: VoterRegistryData | null
): Promise<MerkleProofResult> {
  const secretField = secretToField(secret);
  const leaf = computeLeaf(secretField);
  const leafHex = toHex(leaf);

  // If no registry data, try to fetch it
  if (!registryData) {
    registryData = await fetchVoterRegistry(proposalId);
  }

  if (registryData && registryData.voters.length > 0) {
    // Find voter by commitment
    const voterIndex = registryData.voters.findIndex(
      v => v.commitment.toLowerCase() === leafHex.toLowerCase()
    );

    if (voterIndex === -1) {
      return {
        success: false,
        error: 'Voter not found in registry. Your secret does not match any registered voter.',
      };
    }

    // Convert all commitments to bigints
    const leaves = registryData.voters.map(v => BigInt(v.commitment));
    const { root, siblings, pathIndices } = computeMerkleProof(leaves, voterIndex);

    return {
      success: true,
      proof: {
        votersRoot: toHex(root),
        siblings: siblings.map(s => toHex(s)),
        pathIndices,
        leaf: leafHex,
        index: voterIndex,
      },
    };
  }

  // Demo mode: single voter tree
  console.warn('No voter registry found - using demo mode');
  const siblings = new Array(TREE_DEPTH).fill(BigInt(0));
  const pathIndices = new Array(TREE_DEPTH).fill(0);

  let current = leaf;
  for (let i = 0; i < TREE_DEPTH; i++) {
    current = poseidonHash(current, BigInt(0));
  }
  const root = current;

  return {
    success: true,
    proof: {
      votersRoot: toHex(root),
      siblings: siblings.map(s => toHex(s)),
      pathIndices,
      leaf: leafHex,
      index: 0,
    },
  };
}

/**
 * Check if a voter's secret matches the proposal's voters_root
 * This validates that the voter is eligible without generating a full proof
 */
export async function checkVoterEligibility(
  secret: string,
  proposalId: number,
  expectedVotersRoot?: string
): Promise<{ eligible: boolean; message: string }> {
  const result = await getMerkleProofForVoter(secret, proposalId);

  if (!result.success) {
    return { eligible: false, message: result.error || 'Unknown error' };
  }

  // If expected root is provided, validate it matches
  if (expectedVotersRoot) {
    const actualRoot = result.proof!.votersRoot.toLowerCase();
    const expected = expectedVotersRoot.toLowerCase();

    if (actualRoot !== expected) {
      return {
        eligible: false,
        message: 'Your merkle proof does not match the proposal\'s voters root. You may not be registered for this proposal.',
      };
    }
  }

  return { eligible: true, message: `Voter eligible at index ${result.proof!.index}` };
}
