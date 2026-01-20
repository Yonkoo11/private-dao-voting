/**
 * Voter Registry - Manages eligible voters for a proposal
 *
 * This module provides:
 * - Voter registration (adding commitment hashes to the merkle tree)
 * - Merkle root computation
 * - Merkle proof generation for voting
 * - Persistent storage of voter data
 */

import * as fs from "fs";
import * as path from "path";
import { buildPoseidon } from "circomlibjs";

type Poseidon = Awaited<ReturnType<typeof buildPoseidon>>;

const TREE_DEPTH = 20;
const DATA_DIR = path.join(process.cwd(), "data");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let poseidon: Poseidon;

export async function initPoseidon(): Promise<void> {
  if (!poseidon) {
    poseidon = await buildPoseidon();
  }
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

interface VoterData {
  commitment: string; // Hex string of the leaf commitment
  addedAt: string; // ISO timestamp
  index: number; // Position in the tree
}

interface RegistryData {
  proposalId: number;
  voters: VoterData[];
  treeDepth: number;
  createdAt: string;
  updatedAt: string;
}

interface MerkleProof {
  root: bigint;
  leaf: bigint;
  siblings: bigint[];
  pathIndices: number[];
}

/**
 * VoterRegistry manages the merkle tree of eligible voters
 */
export class VoterRegistry {
  private proposalId: number;
  private leaves: bigint[] = [];
  private filePath: string;

  constructor(proposalId: number) {
    this.proposalId = proposalId;
    this.filePath = path.join(DATA_DIR, `proposal_${proposalId}_voters.json`);
  }

  /**
   * Load registry from file
   */
  async load(): Promise<void> {
    await initPoseidon();

    if (fs.existsSync(this.filePath)) {
      const data = JSON.parse(fs.readFileSync(this.filePath, "utf-8")) as RegistryData;
      this.leaves = data.voters.map((v) => BigInt(v.commitment));
      console.log(`Loaded ${this.leaves.length} voters for proposal ${this.proposalId}`);
    } else {
      console.log(`Creating new voter registry for proposal ${this.proposalId}`);
    }
  }

  /**
   * Save registry to file
   */
  private save(): void {
    const data: RegistryData = {
      proposalId: this.proposalId,
      voters: this.leaves.map((leaf, index) => ({
        commitment: "0x" + leaf.toString(16).padStart(64, "0"),
        addedAt: new Date().toISOString(),
        index,
      })),
      treeDepth: TREE_DEPTH,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Add a voter by their secret
   * Returns the leaf commitment
   */
  addVoterBySecret(secret: bigint): { leaf: bigint; index: number } {
    const leaf = computeLeaf(secret);
    return this.addVoterByCommitment(leaf);
  }

  /**
   * Add a voter by their pre-computed commitment
   */
  addVoterByCommitment(commitment: bigint): { leaf: bigint; index: number } {
    // Check for duplicate
    const existingIndex = this.leaves.findIndex((l) => l === commitment);
    if (existingIndex !== -1) {
      console.log(`Warning: Voter commitment already registered at index ${existingIndex}`);
      return { leaf: commitment, index: existingIndex };
    }

    const index = this.leaves.length;
    this.leaves.push(commitment);
    this.save();

    console.log(`Registered voter at index ${index}`);
    return { leaf: commitment, index };
  }

  /**
   * Get the merkle root of all registered voters
   */
  computeRoot(): bigint {
    if (this.leaves.length === 0) {
      // Empty tree has all-zero root
      let current = BigInt(0);
      for (let i = 0; i < TREE_DEPTH; i++) {
        current = hashTwo(current, BigInt(0));
      }
      return current;
    }

    // Pad leaves to next power of 2
    const numLeaves = Math.pow(2, Math.ceil(Math.log2(Math.max(this.leaves.length, 1))));
    const paddedLeaves = [...this.leaves];
    while (paddedLeaves.length < numLeaves) {
      paddedLeaves.push(BigInt(0)); // Pad with zeros
    }

    // Build the tree level by level
    let currentLevel = paddedLeaves;

    for (let depth = 0; depth < TREE_DEPTH; depth++) {
      const nextLevel: bigint[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] ?? BigInt(0);
        nextLevel.push(hashTwo(left, right));
      }
      currentLevel = nextLevel;

      // If we've reached the root, stop
      if (currentLevel.length === 1) {
        // Continue to full depth with zero siblings
        let root = currentLevel[0];
        for (let j = depth + 1; j < TREE_DEPTH; j++) {
          root = hashTwo(root, BigInt(0));
        }
        return root;
      }
    }

    return currentLevel[0];
  }

  /**
   * Get merkle proof for a voter at a given index
   */
  getMerkleProof(index: number): MerkleProof {
    if (index >= this.leaves.length) {
      throw new Error(`Voter index ${index} not found. Only ${this.leaves.length} voters registered.`);
    }

    const leaf = this.leaves[index];
    const siblings: bigint[] = [];
    const pathIndices: number[] = [];

    // Pad leaves to next power of 2
    const numLeaves = Math.pow(2, Math.ceil(Math.log2(Math.max(this.leaves.length, 1))));
    const paddedLeaves = [...this.leaves];
    while (paddedLeaves.length < numLeaves) {
      paddedLeaves.push(BigInt(0));
    }

    let currentLevel = paddedLeaves;
    let currentIndex = index;

    for (let depth = 0; depth < TREE_DEPTH; depth++) {
      const isRight = currentIndex % 2;
      pathIndices.push(isRight);

      // Get sibling
      const siblingIndex = isRight === 0 ? currentIndex + 1 : currentIndex - 1;
      const sibling = siblingIndex < currentLevel.length ? currentLevel[siblingIndex] : BigInt(0);
      siblings.push(sibling);

      // Compute next level
      const nextLevel: bigint[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] ?? BigInt(0);
        nextLevel.push(hashTwo(left, right));
      }

      if (nextLevel.length === 0) {
        // Fill remaining with zeros
        for (let j = depth + 1; j < TREE_DEPTH; j++) {
          siblings.push(BigInt(0));
          pathIndices.push(0);
        }
        break;
      }

      currentLevel = nextLevel;
      currentIndex = Math.floor(currentIndex / 2);

      if (currentLevel.length === 1) {
        // Fill remaining with zeros
        for (let j = depth + 1; j < TREE_DEPTH; j++) {
          siblings.push(BigInt(0));
          pathIndices.push(0);
        }
        break;
      }
    }

    const root = this.computeRoot();

    return { root, leaf, siblings, pathIndices };
  }

  /**
   * Get merkle proof for a voter by their secret
   */
  getMerkleProofBySecret(secret: bigint): MerkleProof {
    const leaf = computeLeaf(secret);
    const index = this.leaves.findIndex((l) => l === leaf);

    if (index === -1) {
      throw new Error("Voter not found. Secret does not match any registered voter.");
    }

    return this.getMerkleProof(index);
  }

  /**
   * Get number of registered voters
   */
  getVoterCount(): number {
    return this.leaves.length;
  }

  /**
   * Get all voter commitments
   */
  getAllCommitments(): bigint[] {
    return [...this.leaves];
  }

  /**
   * Check if a voter is registered
   */
  isVoterRegistered(secret: bigint): boolean {
    const leaf = computeLeaf(secret);
    return this.leaves.some((l) => l === leaf);
  }
}

/**
 * Helper to format bigint as hex
 */
export function toHex(n: bigint): string {
  return "0x" + n.toString(16).padStart(64, "0");
}

/**
 * Helper to convert bigint to bytes32
 */
export function bigintToBytes32(n: bigint): Uint8Array {
  const hex = n.toString(16).padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
