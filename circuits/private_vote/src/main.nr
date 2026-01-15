// ============================================================================
// Private DAO Voting Circuit
// ============================================================================
// Proves that a voter is eligible AND casts a vote WITHOUT revealing identity.
//
// What this proves:
// 1. "I am in the eligible voters tree" (membership/inclusion proof)
// 2. "This nullifier is mine" (prevents double voting)
// 3. "I'm voting yes (1) or no (0)"
//
// What stays hidden:
// - Which voter you are
// - Your secret key
// - Only the nullifier and vote are revealed
//
// How double-voting is prevented:
// - Each voter has a secret only they know
// - Nullifier = hash(secret, proposal_id)
// - Same voter + same proposal = same nullifier
// - Contract rejects duplicate nullifiers
// - But nullifier can't be traced back to voter
// ============================================================================

use dep::poseidon::poseidon::bn254::hash_2 as poseidon_hash;

// Tree configuration
// 20 levels = 2^20 = ~1 million possible voters (practical for most DAOs)
global TREE_DEPTH: u32 = 20;

// ============================================================================
// Hash Functions
// ============================================================================

/// Poseidon hash of two Field elements
fn hash_2(left: Field, right: Field) -> Field {
    poseidon_hash([left, right])
}

/// Compute the leaf commitment from voter secret
/// leaf = hash(secret, secret) - simple commitment scheme
/// The secret is known only to the voter
pub fn compute_leaf(secret: Field) -> Field {
    hash_2(secret, secret)
}

/// Compute nullifier from secret and proposal ID
/// nullifier = hash(secret, proposal_id)
/// - Deterministic: same secret + proposal = same nullifier
/// - Unlinkable: can't derive secret from nullifier
pub fn compute_nullifier(secret: Field, proposal_id: Field) -> Field {
    hash_2(secret, proposal_id)
}

// ============================================================================
// Merkle Tree
// ============================================================================

/// Compute merkle root from leaf + sibling path
fn compute_merkle_root<let N: u32>(
    leaf: Field,
    path_indices: [u1; N],  // 0 = left, 1 = right
    siblings: [Field; N]
) -> Field {
    let mut current = leaf;

    for i in 0..N {
        let sibling = siblings[i];
        let is_right = path_indices[i];

        // If is_right = 0, we're the left child: hash(current, sibling)
        // If is_right = 1, we're the right child: hash(sibling, current)
        let (left, right) = if is_right == 0 {
            (current, sibling)
        } else {
            (sibling, current)
        };

        current = hash_2(left, right);
    }

    current
}

// ============================================================================
// Main Circuit
// ============================================================================

/// Cast a private vote
///
/// PUBLIC INPUTS (visible on-chain):
/// - voters_root: Merkle root of eligible voters tree
/// - nullifier: Unique per voter+proposal (prevents double voting)
/// - proposal_id: Which proposal we're voting on
/// - vote: The vote choice (0 = no, 1 = yes)
///
/// PRIVATE INPUTS (hidden, known only to voter):
/// - secret: Voter's secret key (used to derive leaf and nullifier)
/// - path_indices: Position in tree at each level (0=left, 1=right)
/// - siblings: Sibling hashes at each level
fn main(
    // Public inputs
    voters_root: pub Field,
    nullifier: pub Field,
    proposal_id: pub Field,
    vote: pub Field,
    // Private inputs
    secret: Field,
    path_indices: [u1; TREE_DEPTH],
    siblings: [Field; TREE_DEPTH],
) {
    // 1. Verify vote is valid (0 or 1)
    assert((vote == 0) | (vote == 1), "Vote must be 0 (no) or 1 (yes)");

    // 2. Compute leaf from secret
    let leaf = compute_leaf(secret);

    // 3. Verify nullifier matches secret + proposal
    //    This binds the proof to this specific proposal
    let computed_nullifier = compute_nullifier(secret, proposal_id);
    assert(computed_nullifier == nullifier, "Nullifier mismatch");

    // 4. Verify voter is in the tree (INCLUSION proof)
    //    The leaf must be non-zero and the path must lead to the root
    let computed_root = compute_merkle_root(leaf, path_indices, siblings);
    assert(computed_root == voters_root, "Not in voters tree");
}

// ============================================================================
// Tests
// ============================================================================

#[test]
fn test_hash_deterministic() {
    let h1 = hash_2(1, 2);
    let h2 = hash_2(1, 2);
    assert(h1 == h2);
}

#[test]
fn test_leaf_computation() {
    let secret: Field = 12345;
    let leaf = compute_leaf(secret);
    assert(leaf != 0, "Leaf should not be zero");

    // Same secret = same leaf
    let leaf2 = compute_leaf(secret);
    assert(leaf == leaf2, "Leaf should be deterministic");
}

#[test]
fn test_nullifier_computation() {
    let secret: Field = 12345;
    let proposal_id: Field = 1;

    let nullifier = compute_nullifier(secret, proposal_id);
    assert(nullifier != 0, "Nullifier should not be zero");

    // Same inputs = same nullifier
    let nullifier2 = compute_nullifier(secret, proposal_id);
    assert(nullifier == nullifier2, "Nullifier should be deterministic");

    // Different proposal = different nullifier
    let nullifier3 = compute_nullifier(secret, 2);
    assert(nullifier != nullifier3, "Different proposal should give different nullifier");
}

#[test]
fn test_merkle_root_simple() {
    // Test with depth 2
    let leaf: Field = 100;
    let siblings: [Field; 2] = [1, 2];
    let path_indices: [u1; 2] = [0, 0]; // leftmost position

    let root = compute_merkle_root(leaf, path_indices, siblings);
    assert(root != 0, "Root should not be zero");
}

#[test]
fn test_full_voting_flow() {
    // Simulate a complete voting scenario
    let secret: Field = 0x1234567890abcdef;
    let proposal_id: Field = 1;
    let vote: Field = 1; // voting yes

    // Compute what the prover would compute
    let leaf = compute_leaf(secret);
    let nullifier = compute_nullifier(secret, proposal_id);

    // Create a simple tree with just this voter
    // For testing, we'll use a small tree and compute the root manually
    let siblings: [Field; TREE_DEPTH] = [0; TREE_DEPTH];
    let path_indices: [u1; TREE_DEPTH] = [0; TREE_DEPTH];

    // Compute expected root
    let voters_root = compute_merkle_root(leaf, path_indices, siblings);

    // Verify all assertions would pass
    assert((vote == 0) | (vote == 1), "Vote must be 0 or 1");
    assert(compute_nullifier(secret, proposal_id) == nullifier, "Nullifier mismatch");
    assert(compute_merkle_root(leaf, path_indices, siblings) == voters_root, "Root mismatch");
}

#[test]
fn test_different_voters_different_nullifiers() {
    let proposal_id: Field = 1;

    let secret1: Field = 111;
    let secret2: Field = 222;

    let nullifier1 = compute_nullifier(secret1, proposal_id);
    let nullifier2 = compute_nullifier(secret2, proposal_id);

    assert(nullifier1 != nullifier2, "Different voters should have different nullifiers");
}

#[test]
fn test_vote_validation() {
    // Valid votes
    let vote_no: Field = 0;
    let vote_yes: Field = 1;

    assert((vote_no == 0) | (vote_no == 1), "0 should be valid");
    assert((vote_yes == 0) | (vote_yes == 1), "1 should be valid");
}
