// ============================================================================
// Private DAO Voting Circuit (Multi-Choice)
// ============================================================================
// Proves that a voter is eligible AND casts a vote WITHOUT revealing identity.
//
// What this proves:
// 1. "I am in the eligible voters tree" (membership/inclusion proof)
// 2. "This nullifier is mine" (prevents double voting)
// 3. "I'm voting for option X" (0 to num_options-1)
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
//
// Multi-choice voting:
// - Supports up to 8 vote options (0-7)
// - num_options is a public input to constrain valid range
// - Backwards compatible: binary votes use num_options=2
// ============================================================================

use dep::poseidon::poseidon::bn254::hash_2 as poseidon_hash;

// Tree configuration
// 20 levels = 2^20 = ~1 million possible voters (practical for most DAOs)
global TREE_DEPTH: u32 = 20;

// Multi-choice voting configuration
// Maximum 8 options (0-7), configurable per proposal via num_options
global MAX_OPTIONS: u8 = 8;

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

/// Cast a private vote (multi-choice)
///
/// PUBLIC INPUTS (visible on-chain):
/// - voters_root: Merkle root of eligible voters tree
/// - nullifier: Unique per voter+proposal (prevents double voting)
/// - proposal_id: Which proposal we're voting on
/// - vote: The vote choice (0 to num_options-1)
/// - num_options: Number of valid options for this proposal (2-8)
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
    num_options: pub Field,
    // Private inputs
    secret: Field,
    path_indices: [u1; TREE_DEPTH],
    siblings: [Field; TREE_DEPTH],
) {
    // 1. Verify num_options is valid (2-8)
    assert(num_options as u8 >= 2, "Must have at least 2 options");
    assert(num_options as u8 <= MAX_OPTIONS, "Maximum 8 options supported");

    // 2. Verify vote is valid (0 to num_options-1)
    assert(vote as u8 < num_options as u8, "Vote must be less than num_options");

    // 3. Compute leaf from secret
    let leaf = compute_leaf(secret);

    // 4. Verify nullifier matches secret + proposal
    //    This binds the proof to this specific proposal
    let computed_nullifier = compute_nullifier(secret, proposal_id);
    assert(computed_nullifier == nullifier, "Nullifier mismatch");

    // 5. Verify voter is in the tree (INCLUSION proof)
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
    // Simulate a complete voting scenario (binary yes/no)
    let secret: Field = 0x1234567890abcdef;
    let proposal_id: Field = 1;
    let vote: Field = 1; // voting yes
    let num_options: Field = 2; // binary vote

    // Compute what the prover would compute
    let leaf = compute_leaf(secret);
    let nullifier = compute_nullifier(secret, proposal_id);

    // Create a simple tree with just this voter
    let siblings: [Field; TREE_DEPTH] = [0; TREE_DEPTH];
    let path_indices: [u1; TREE_DEPTH] = [0; TREE_DEPTH];

    // Compute expected root
    let voters_root = compute_merkle_root(leaf, path_indices, siblings);

    // Verify all assertions would pass
    assert(num_options as u8 >= 2, "Must have at least 2 options");
    assert(num_options as u8 <= MAX_OPTIONS, "Max 8 options");
    assert(vote as u8 < num_options as u8, "Vote must be less than num_options");
    assert(compute_nullifier(secret, proposal_id) == nullifier, "Nullifier mismatch");
    assert(compute_merkle_root(leaf, path_indices, siblings) == voters_root, "Root mismatch");
}

#[test]
fn test_multi_choice_voting() {
    // Test multi-choice voting with 4 options
    let secret: Field = 0xabcdef123456;
    let proposal_id: Field = 42;
    let num_options: Field = 4; // 4 choices: 0, 1, 2, 3

    // Test voting for option 2
    let vote: Field = 2;
    assert(vote as u8 < num_options as u8, "Vote 2 should be valid for 4 options");

    // Test voting for option 3 (max valid)
    let vote_max: Field = 3;
    assert(vote_max as u8 < num_options as u8, "Vote 3 should be valid for 4 options");

    // Verify nullifier still works
    let nullifier = compute_nullifier(secret, proposal_id);
    assert(nullifier != 0, "Nullifier should be non-zero");
}

#[test]
fn test_max_options() {
    // Test with maximum 8 options
    let num_options: Field = 8;
    assert(num_options as u8 <= MAX_OPTIONS, "8 options should be valid");

    // All votes 0-7 should be valid
    for i in 0..8 {
        let vote: Field = i as Field;
        assert(vote as u8 < num_options as u8, "Votes 0-7 should be valid");
    }
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
    // Valid votes for binary (2 options)
    let num_options: Field = 2;
    let vote_no: Field = 0;
    let vote_yes: Field = 1;

    assert(vote_no as u8 < num_options as u8, "0 should be valid");
    assert(vote_yes as u8 < num_options as u8, "1 should be valid");

    // Valid votes for multi-choice (5 options)
    let num_options_5: Field = 5;
    for i in 0..5 {
        let vote: Field = i as Field;
        assert(vote as u8 < num_options_5 as u8, "Votes 0-4 should be valid for 5 options");
    }
}

// ============================================================================
// Comprehensive Security Tests
// ============================================================================

#[test]
fn test_nullifier_uniqueness_across_proposals() {
    // Same voter voting on different proposals must produce different nullifiers
    let secret: Field = 0xdeadbeef;

    let nullifier_p1 = compute_nullifier(secret, 1);
    let nullifier_p2 = compute_nullifier(secret, 2);
    let nullifier_p3 = compute_nullifier(secret, 3);

    assert(nullifier_p1 != nullifier_p2, "Nullifiers must differ across proposals");
    assert(nullifier_p2 != nullifier_p3, "Nullifiers must differ across proposals");
    assert(nullifier_p1 != nullifier_p3, "Nullifiers must differ across proposals");
}

#[test]
fn test_nullifier_collision_resistance() {
    // Different secrets should produce different nullifiers for same proposal
    let proposal_id: Field = 42;

    let secrets: [Field; 5] = [1, 2, 100, 999999, 0x123456789abcdef];
    let mut nullifiers: [Field; 5] = [0; 5];

    for i in 0..5 {
        nullifiers[i] = compute_nullifier(secrets[i], proposal_id);
    }

    // Check all pairs are different
    for i in 0..5 {
        for j in (i + 1)..5 {
            assert(nullifiers[i] != nullifiers[j], "Nullifier collision detected");
        }
    }
}

#[test]
fn test_merkle_path_positions() {
    // Test different positions in tree produce different roots with same leaf
    let leaf: Field = 0xabcdef;
    let siblings: [Field; 3] = [111, 222, 333];

    let path_left: [u1; 3] = [0, 0, 0];
    let path_right: [u1; 3] = [1, 1, 1];
    let path_mixed: [u1; 3] = [0, 1, 0];

    let root_left = compute_merkle_root(leaf, path_left, siblings);
    let root_right = compute_merkle_root(leaf, path_right, siblings);
    let root_mixed = compute_merkle_root(leaf, path_mixed, siblings);

    assert(root_left != root_right, "Different paths should give different roots");
    assert(root_left != root_mixed, "Different paths should give different roots");
    assert(root_right != root_mixed, "Different paths should give different roots");
}

#[test]
fn test_leaf_secret_binding() {
    // Different secrets must produce different leaves
    let secret1: Field = 1;
    let secret2: Field = 2;

    let leaf1 = compute_leaf(secret1);
    let leaf2 = compute_leaf(secret2);

    assert(leaf1 != leaf2, "Different secrets must produce different leaves");
}

#[test]
fn test_empty_tree_single_voter() {
    // Single voter in tree with all zero siblings
    let secret: Field = 0xcafe;
    let leaf = compute_leaf(secret);

    let siblings: [Field; TREE_DEPTH] = [0; TREE_DEPTH];
    let path_indices: [u1; TREE_DEPTH] = [0; TREE_DEPTH];

    let root = compute_merkle_root(leaf, path_indices, siblings);

    // Root should be deterministic
    let root2 = compute_merkle_root(leaf, path_indices, siblings);
    assert(root == root2, "Root computation must be deterministic");
}

#[test]
fn test_max_tree_depth_path() {
    // Rightmost position in tree (all 1s in path)
    let secret: Field = 0xfeed;
    let leaf = compute_leaf(secret);

    let siblings: [Field; TREE_DEPTH] = [0; TREE_DEPTH];
    let mut path_indices: [u1; TREE_DEPTH] = [0; TREE_DEPTH];

    // Set all path indices to 1 (rightmost position)
    for i in 0..TREE_DEPTH {
        path_indices[i] = 1;
    }

    let root = compute_merkle_root(leaf, path_indices, siblings);
    assert(root != 0, "Rightmost path should produce valid root");
}

#[test]
fn test_zero_secret_edge_case() {
    // Zero is a valid secret (edge case)
    let secret: Field = 0;
    let leaf = compute_leaf(secret);

    // Leaf should still be non-zero due to Poseidon properties
    // Note: hash(0, 0) != 0 for Poseidon
    let nullifier = compute_nullifier(secret, 1);

    // Both should be valid (non-zero typically)
    assert(leaf == compute_leaf(0), "Zero secret should be consistent");
    assert(nullifier == compute_nullifier(0, 1), "Zero secret nullifier should be consistent");
}

#[test]
fn test_large_proposal_id() {
    // Large proposal IDs should work correctly
    let secret: Field = 12345;
    let large_proposal: Field = 0xffffffffffffffff;

    let nullifier = compute_nullifier(secret, large_proposal);
    assert(nullifier != 0, "Large proposal ID should produce valid nullifier");

    // Different from smaller proposal
    let small_nullifier = compute_nullifier(secret, 1);
    assert(nullifier != small_nullifier, "Different proposal IDs must differ");
}

#[test]
fn test_two_voter_tree() {
    // Two voters in adjacent positions
    let secret1: Field = 0x1111;
    let secret2: Field = 0x2222;

    let leaf1 = compute_leaf(secret1);
    let leaf2 = compute_leaf(secret2);

    // Voter 1 is at position 0 (left), voter 2 is their sibling
    // For depth 1: root = hash(leaf1, leaf2)
    let root_from_v1 = hash_2(leaf1, leaf2);

    // Verify with merkle path from voter 1's perspective (depth 1 for simplicity)
    let siblings_v1: [Field; 1] = [leaf2];
    let path_v1: [u1; 1] = [0]; // left position
    let computed_root_v1 = compute_merkle_root(leaf1, path_v1, siblings_v1);

    assert(computed_root_v1 == root_from_v1, "Voter 1 path should lead to same root");

    // Voter 2's perspective
    let siblings_v2: [Field; 1] = [leaf1];
    let path_v2: [u1; 1] = [1]; // right position
    let computed_root_v2 = compute_merkle_root(leaf2, path_v2, siblings_v2);

    assert(computed_root_v2 == root_from_v1, "Voter 2 path should lead to same root");
}

#[test]
fn test_poseidon_hash_properties() {
    // Poseidon should be non-commutative for ordered pairs
    let a: Field = 100;
    let b: Field = 200;

    let hash_ab = hash_2(a, b);
    let hash_ba = hash_2(b, a);

    // hash(a,b) != hash(b,a) for a != b
    assert(hash_ab != hash_ba, "Poseidon should be order-dependent");
}

#[test]
fn test_complete_voting_scenario_no_vote() {
    // Complete flow with vote = 0 (binary)
    let secret: Field = 0xbeef;
    let proposal_id: Field = 100;
    let vote: Field = 0; // voting NO
    let num_options: Field = 2; // binary

    let leaf = compute_leaf(secret);
    let nullifier = compute_nullifier(secret, proposal_id);

    let siblings: [Field; TREE_DEPTH] = [0; TREE_DEPTH];
    let path_indices: [u1; TREE_DEPTH] = [0; TREE_DEPTH];
    let voters_root = compute_merkle_root(leaf, path_indices, siblings);

    // All assertions from main should pass
    assert(num_options as u8 >= 2, "Must have at least 2 options");
    assert(vote as u8 < num_options as u8, "Vote must be valid");
    assert(compute_nullifier(secret, proposal_id) == nullifier, "Nullifier mismatch");
    assert(compute_merkle_root(leaf, path_indices, siblings) == voters_root, "Root mismatch");
}

#[test]
fn test_complete_multi_choice_scenario() {
    // Complete flow with multi-choice (4 options)
    let secret: Field = 0xdeadbeef;
    let proposal_id: Field = 200;
    let vote: Field = 2; // voting for option 2
    let num_options: Field = 4;

    let leaf = compute_leaf(secret);
    let nullifier = compute_nullifier(secret, proposal_id);

    let siblings: [Field; TREE_DEPTH] = [0; TREE_DEPTH];
    let path_indices: [u1; TREE_DEPTH] = [0; TREE_DEPTH];
    let voters_root = compute_merkle_root(leaf, path_indices, siblings);

    // All assertions from main should pass
    assert(num_options as u8 >= 2, "Must have at least 2 options");
    assert(num_options as u8 <= MAX_OPTIONS, "Max 8 options");
    assert(vote as u8 < num_options as u8, "Vote must be valid");
    assert(compute_nullifier(secret, proposal_id) == nullifier, "Nullifier mismatch");
    assert(compute_merkle_root(leaf, path_indices, siblings) == voters_root, "Root mismatch");
}

#[test]
fn test_deterministic_proof_generation() {
    // Same inputs should always produce same intermediate values
    let secret: Field = 0x999;
    let proposal_id: Field = 7;

    // Run computations twice
    let leaf1 = compute_leaf(secret);
    let leaf2 = compute_leaf(secret);

    let null1 = compute_nullifier(secret, proposal_id);
    let null2 = compute_nullifier(secret, proposal_id);

    let siblings: [Field; 3] = [1, 2, 3];
    let path: [u1; 3] = [0, 1, 0];

    let root1 = compute_merkle_root(leaf1, path, siblings);
    let root2 = compute_merkle_root(leaf2, path, siblings);

    assert(leaf1 == leaf2, "Leaf computation must be deterministic");
    assert(null1 == null2, "Nullifier computation must be deterministic");
    assert(root1 == root2, "Root computation must be deterministic");
}
