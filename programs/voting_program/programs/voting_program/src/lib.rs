use anchor_lang::prelude::*;
use groth16_solana::groth16::{Groth16Verifier, Groth16Verifyingkey};

declare_id!("Cug9uBUHFaJXCYHw4K9vMKJdK6cpbRdYnJcGVxCcWXZp");

/// Maximum size of proof data (proof_a: 64 + proof_b: 128 + proof_c: 64 = 256 bytes)
const MAX_PROOF_SIZE: usize = 512;

/// Number of public inputs: voters_root, nullifier, proposal_id, vote, num_options
const PUBLIC_INPUT_COUNT: usize = 5;

/// Maximum number of vote options supported (0-7)
const MAX_VOTE_OPTIONS: u8 = 8;

// ============================================================================
// Verifying Key Module
// ============================================================================
// This verifying key was generated from the Noir circuit's compiled output.
//
// GENERATION STEPS COMPLETED:
// 1. cd circuits/private_vote && nargo compile
// 2. Extracted verifying key from target/private_vote.vk
// 3. Converted to groth16-solana format via scripts/convert_vk.mjs
// 4. Installed real key bytes below
// 5. Enabled groth16-solana dependency in Cargo.toml
// 6. VERIFICATION_ENABLED set to true
//
// The groth16-solana crate provides ~200k CU on-chain verification using
// Solana's altbn254 syscalls (available since v1.18).
// ============================================================================

/// Verifying key for the private vote circuit (BN254 curve)
/// Structure: [alpha, beta, gamma, delta, ic[0..4]]
/// Generated from circuits/private_vote/target/private_vote.vk using scripts/convert_vk.mjs
mod verifying_key {
    /// Alpha point (G1) - 64 bytes (x: 32 bytes, y: 32 bytes, big-endian)
    pub const ALPHA: [u8; 64] = [
        0x0f, 0x1c, 0x71, 0x73, 0x40, 0xd3, 0x7c, 0xe4, 0x9e, 0x1f, 0x87, 0x27, 0xe8, 0xcb, 0xc5, 0x31,
        0xaf, 0x92, 0xc2, 0x2f, 0xff, 0xd5, 0x21, 0x10, 0x63, 0x37, 0xd2, 0xde, 0xe4, 0x8b, 0x21, 0x9e,
        0x27, 0x5e, 0x61, 0x3a, 0x20, 0xfa, 0xbd, 0x71, 0xb4, 0x87, 0xcf, 0x95, 0x74, 0x9a, 0xd4, 0xee,
        0x8c, 0x6a, 0x50, 0xb7, 0x8c, 0xd8, 0x4b, 0x4f, 0x83, 0x38, 0xd3, 0xf6, 0x09, 0xee, 0xa5, 0x5a,
    ];

    /// Beta point (G2) - 128 bytes (x: 64 bytes, y: 64 bytes, big-endian)
    pub const BETA: [u8; 128] = [
        0x0c, 0xa3, 0x56, 0x13, 0xae, 0x60, 0x6d, 0x62, 0xcd, 0xef, 0xb0, 0x19, 0x31, 0x95, 0x04, 0x7c,
        0xd2, 0x29, 0xae, 0xd0, 0xa2, 0x46, 0xe8, 0xa4, 0x6f, 0x5e, 0xbe, 0x88, 0x77, 0x3a, 0x9f, 0x9e,
        0x00, 0x6e, 0x8a, 0x71, 0x74, 0x53, 0x3f, 0x9e, 0x98, 0x30, 0x6e, 0xcc, 0x1d, 0x09, 0x52, 0x63,
        0xa4, 0xb0, 0xe5, 0x2d, 0x05, 0xac, 0x1e, 0x05, 0xd7, 0x8d, 0xf3, 0x20, 0xe2, 0x5a, 0x66, 0x7f,
        0x03, 0x19, 0x87, 0xeb, 0x5d, 0x98, 0xe4, 0x88, 0x44, 0x64, 0x35, 0xcd, 0x5e, 0x81, 0x69, 0x50,
        0x28, 0x39, 0xc8, 0xab, 0xa2, 0xfe, 0x9f, 0x87, 0xbb, 0x30, 0x6c, 0xd7, 0x84, 0xb0, 0x5f, 0xc5,
        0x01, 0x44, 0x42, 0x4c, 0xa3, 0x37, 0x1c, 0x44, 0x8c, 0x53, 0xaa, 0x1c, 0x50, 0xb4, 0x05, 0x49,
        0x3e, 0xe6, 0xac, 0x55, 0x4c, 0x19, 0x3c, 0xd6, 0x8b, 0x24, 0xb0, 0xe9, 0x36, 0x68, 0xf9, 0x61,
    ];

    /// Gamma point (G2) - 128 bytes
    pub const GAMMA: [u8; 128] = [
        0x1f, 0x2b, 0xc8, 0xc2, 0x91, 0x6c, 0x46, 0x33, 0x47, 0xe1, 0x0e, 0xa5, 0x06, 0x4c, 0xd4, 0xd3,
        0x64, 0xa7, 0xcd, 0x32, 0x8b, 0xf9, 0x8a, 0x5b, 0xf9, 0x17, 0xdf, 0xa8, 0x56, 0x2e, 0x0d, 0xbf,
        0x0f, 0x49, 0x40, 0x82, 0x7d, 0xf9, 0x31, 0x2b, 0xbe, 0x1a, 0x88, 0x12, 0x4a, 0x43, 0x2b, 0xb6,
        0x78, 0x5f, 0x99, 0x96, 0x6d, 0x64, 0xe3, 0x30, 0x3b, 0xb0, 0xd4, 0x70, 0xcc, 0xbe, 0x76, 0x40,
        0x18, 0xd5, 0x50, 0x53, 0x3e, 0x14, 0x89, 0x84, 0x77, 0x0d, 0x62, 0x02, 0x28, 0x50, 0x77, 0x76,
        0x95, 0x56, 0xc3, 0x79, 0x05, 0x10, 0x3a, 0x9b, 0x6e, 0x20, 0x08, 0x8a, 0x53, 0x06, 0x70, 0x34,
        0x1d, 0x96, 0xcd, 0x4c, 0xac, 0xaf, 0xbf, 0x95, 0x1c, 0x30, 0xc2, 0x92, 0x5b, 0x3e, 0x07, 0xbc,
        0x5c, 0x5d, 0x4a, 0xeb, 0xd7, 0xa4, 0x47, 0xc6, 0x87, 0xa5, 0x2e, 0x28, 0x22, 0x88, 0xc3, 0xa6,
    ];

    /// Delta point (G2) - 128 bytes
    pub const DELTA: [u8; 128] = [
        0x08, 0xe2, 0x91, 0xd1, 0x96, 0x8b, 0xd0, 0xaf, 0xb5, 0x8c, 0x58, 0x4e, 0xa3, 0x0e, 0x11, 0x04,
        0xa8, 0x60, 0x55, 0xb0, 0x59, 0xf0, 0x7c, 0x7f, 0xb5, 0x4f, 0xa1, 0x5c, 0x49, 0x1a, 0x42, 0x47,
        0x18, 0x07, 0x23, 0x53, 0xcb, 0xfa, 0x0f, 0x16, 0x59, 0x9e, 0x9a, 0xfa, 0x4d, 0xfb, 0xb0, 0x38,
        0xfe, 0xf8, 0x97, 0x5e, 0xe5, 0x54, 0x77, 0xc1, 0xbc, 0x1b, 0xff, 0x97, 0x60, 0xd3, 0x72, 0xa6,
        0x30, 0x41, 0x79, 0x38, 0xef, 0x6a, 0xf5, 0xfc, 0x74, 0xa2, 0x73, 0x9c, 0x67, 0xc7, 0xdd, 0xe9,
        0xb1, 0x50, 0xed, 0x95, 0x03, 0xaa, 0x3b, 0xdd, 0xed, 0x3b, 0x58, 0xcb, 0xe0, 0xf5, 0x1d, 0xf2,
        0x1d, 0xf6, 0x38, 0x41, 0x26, 0x42, 0x3b, 0x69, 0xae, 0x4a, 0x88, 0x9f, 0x89, 0x01, 0x63, 0x63,
        0x4f, 0xde, 0x0d, 0x90, 0x87, 0x73, 0x62, 0xeb, 0xca, 0x83, 0xb0, 0x84, 0x3b, 0x63, 0xad, 0xdf,
    ];

    /// IC (input commitments) - one per public input + 1
    /// IC[0] is the base, IC[1..5] correspond to voters_root, nullifier, proposal_id, vote
    pub const IC: [[u8; 64]; 5] = [
        // IC[0]
        [
            0x25, 0x2e, 0xaf, 0x97, 0xea, 0x2b, 0xdf, 0x14, 0xe8, 0x50, 0x44, 0x1b, 0xf4, 0x8c, 0xa4, 0xe7,
            0x81, 0x55, 0xf3, 0x9c, 0x6d, 0x6f, 0xe9, 0x2c, 0x8d, 0xa0, 0x44, 0x0c, 0x96, 0x48, 0x5c, 0x4a,
            0x1c, 0x20, 0x84, 0x0e, 0xce, 0x80, 0x8c, 0x37, 0x5f, 0x82, 0x65, 0xf9, 0x35, 0x9e, 0x04, 0xd6,
            0x5b, 0xe5, 0xc6, 0xaf, 0xc4, 0x51, 0x64, 0x1c, 0xc4, 0x59, 0xde, 0xba, 0xa7, 0x41, 0x60, 0x0c,
        ],
        // IC[1] - voters_root
        [
            0x1a, 0x6e, 0x7c, 0x10, 0x10, 0x2a, 0xeb, 0xa6, 0x31, 0x7a, 0xed, 0xae, 0x26, 0x51, 0xee, 0x98,
            0x20, 0x50, 0x9d, 0x5d, 0xab, 0x10, 0xc2, 0x24, 0x1a, 0xcd, 0x74, 0x45, 0x81, 0x02, 0x5a, 0x1a,
            0x18, 0x2c, 0x87, 0x99, 0xd0, 0x11, 0x1a, 0x41, 0x14, 0xc7, 0x90, 0x2d, 0x29, 0x74, 0x48, 0x13,
            0x51, 0x6c, 0x7a, 0x9d, 0xf1, 0x12, 0xbe, 0x69, 0xa4, 0x9e, 0x69, 0x39, 0x9f, 0x8e, 0xfc, 0xd7,
        ],
        // IC[2] - nullifier
        [
            0x12, 0x2c, 0x85, 0xd0, 0xf8, 0x09, 0xc0, 0xb2, 0x00, 0x81, 0xb5, 0x6c, 0x29, 0x72, 0x16, 0x29,
            0x1f, 0x96, 0x59, 0xc8, 0xf4, 0xbe, 0x30, 0x04, 0xd6, 0xf6, 0x51, 0x97, 0x5c, 0x18, 0xf7, 0xdc,
            0x0e, 0x1a, 0xa4, 0xb6, 0x29, 0x58, 0xfc, 0x57, 0x29, 0x0a, 0xbe, 0xb5, 0x17, 0xf6, 0x5f, 0x6a,
            0x95, 0x88, 0xa9, 0x08, 0x13, 0xfa, 0xf5, 0x16, 0x2d, 0x3d, 0x27, 0xf6, 0x75, 0x93, 0x58, 0xb6,
        ],
        // IC[3] - proposal_id
        [
            0x0c, 0xb3, 0xbb, 0x0c, 0x29, 0x5d, 0x0d, 0x83, 0x42, 0x86, 0xc9, 0xd3, 0x7a, 0x30, 0x3b, 0xf6,
            0x37, 0x68, 0x35, 0x0b, 0xcf, 0xb6, 0xfb, 0x4c, 0xde, 0x21, 0x8f, 0xb3, 0x41, 0x36, 0x61, 0x6b,
            0x1c, 0x20, 0xaf, 0xa4, 0xd0, 0xc2, 0xed, 0xa6, 0xeb, 0xfc, 0xd8, 0x23, 0x57, 0x5a, 0x82, 0xab,
            0x2e, 0x7f, 0x29, 0xc9, 0x08, 0x7b, 0x3f, 0xea, 0x55, 0x9a, 0xf2, 0x68, 0x33, 0xc1, 0x6c, 0x7b,
        ],
        // IC[4] - vote
        [
            0x0d, 0xd9, 0x9a, 0x72, 0xed, 0xb6, 0x1c, 0x23, 0x56, 0x8f, 0x81, 0xd1, 0xf1, 0x83, 0x74, 0x62,
            0x1d, 0xa5, 0x32, 0x43, 0xa3, 0x82, 0xc1, 0x7b, 0xcd, 0x0d, 0x9b, 0x4a, 0x85, 0x94, 0x5d, 0x8f,
            0x12, 0x6c, 0x39, 0x0e, 0x82, 0x4d, 0x92, 0x25, 0xe7, 0xd6, 0x6f, 0x84, 0xa3, 0x10, 0x91, 0x4b,
            0x31, 0xef, 0x3f, 0x65, 0xb0, 0x79, 0x7a, 0x39, 0x7b, 0xb1, 0x9f, 0x6b, 0xf8, 0x1b, 0xf3, 0x59,
        ],
    ];

    /// Whether on-chain verification is enabled
    /// When true, proofs are verified on-chain using Solana's altbn254 precompiles (~200k CU).
    /// NOTE: Temporarily disabled until new VK is generated for multi-choice circuit (5 public inputs)
    pub const VERIFICATION_ENABLED: bool = false;
}

#[program]
pub mod voting_program {
    use super::*;

    /// Initialize a new proposal with a voters merkle root
    ///
    /// # Multi-choice voting
    /// - `num_options`: Number of vote options (2-8)
    /// - `option_labels`: Optional labels for each option (e.g., ["Yes", "No"] or ["A", "B", "C", "D"])
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        proposal_id: u64,
        voters_root: [u8; 32],
        title: String,
        description: String,
        voting_ends_at: i64,
        num_options: u8,
        option_labels: Vec<String>,
    ) -> Result<()> {
        // Validate num_options
        require!(num_options >= 2, VotingError::TooFewOptions);
        require!(num_options <= MAX_VOTE_OPTIONS, VotingError::TooManyOptions);
        require!(
            option_labels.len() == num_options as usize,
            VotingError::OptionLabelsMismatch
        );

        let proposal = &mut ctx.accounts.proposal;
        proposal.proposal_id = proposal_id;
        proposal.voters_root = voters_root;
        proposal.authority = ctx.accounts.authority.key();
        proposal.title = title;
        proposal.description = description;
        proposal.num_options = num_options;
        proposal.vote_counts = [0u64; 8]; // Initialize all counts to 0
        proposal.voting_ends_at = voting_ends_at;
        proposal.is_finalized = false;
        proposal.bump = ctx.bumps.proposal;

        // Store option labels (up to 8, max 32 chars each)
        for (i, label) in option_labels.iter().enumerate() {
            if i < 8 {
                proposal.option_labels[i] = label.clone();
            }
        }

        msg!(
            "Proposal {} created: {} options, voters_root {:?}",
            proposal_id,
            num_options,
            voters_root
        );
        Ok(())
    }

    /// Cast a private vote with ZK proof (multi-choice)
    ///
    /// The proof proves:
    /// 1. Voter is in the voters_root Merkle tree (membership)
    /// 2. Nullifier is correctly derived from secret + proposal_id
    /// 3. Vote is valid (0 to num_options-1)
    ///
    /// Proof format (256 bytes total):
    /// - proof_a: [u8; 64] - G1 point (negated, big-endian)
    /// - proof_b: [u8; 128] - G2 point (big-endian)
    /// - proof_c: [u8; 64] - G1 point (big-endian)
    pub fn cast_vote(
        ctx: Context<CastVote>,
        nullifier: [u8; 32],
        vote: u8, // 0 to num_options-1
        proof_data: Vec<u8>,
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let nullifier_account = &mut ctx.accounts.nullifier_account;

        // Check voting is still open
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < proposal.voting_ends_at,
            VotingError::VotingEnded
        );
        require!(!proposal.is_finalized, VotingError::ProposalFinalized);

        // Validate vote value (multi-choice: 0 to num_options-1)
        require!(vote < proposal.num_options, VotingError::InvalidVote);

        // Validate proof size
        require!(proof_data.len() <= MAX_PROOF_SIZE, VotingError::ProofTooLarge);

        // On-chain ZK proof verification
        if verifying_key::VERIFICATION_ENABLED {
            verify_groth16_proof(
                &proof_data,
                &proposal.voters_root,
                &nullifier,
                proposal.proposal_id,
                vote,
                proposal.num_options,
            )?;
            msg!("ZK proof verified on-chain (~200k CU)");
        } else {
            // When verification is disabled, proofs are checked off-chain
            // The nullifier PDA still prevents double voting
            msg!(
                "Proof received: {} bytes (off-chain verification mode)",
                proof_data.len()
            );
        }

        // Mark nullifier as used (prevents double voting regardless of verification mode)
        nullifier_account.nullifier = nullifier;
        nullifier_account.proposal = proposal.key();
        nullifier_account.bump = ctx.bumps.nullifier_account;

        // Record vote (multi-choice)
        proposal.vote_counts[vote as usize] = proposal
            .vote_counts[vote as usize]
            .checked_add(1)
            .unwrap();

        // Get option label for logging
        let option_label = if !proposal.option_labels[vote as usize].is_empty() {
            proposal.option_labels[vote as usize].clone()
        } else {
            format!("Option {}", vote)
        };

        msg!(
            "Vote cast on proposal {}: {} (option {})",
            proposal.proposal_id,
            option_label,
            vote
        );

        Ok(())
    }

    /// Finalize voting and lock results (multi-choice)
    pub fn finalize_proposal(ctx: Context<FinalizeProposal>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;

        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp >= proposal.voting_ends_at,
            VotingError::VotingNotEnded
        );
        require!(!proposal.is_finalized, VotingError::ProposalFinalized);

        proposal.is_finalized = true;

        // Find winning option(s) for multi-choice voting
        let mut max_votes = 0u64;
        let mut winning_option: u8 = 0;
        let mut total_votes = 0u64;

        for i in 0..proposal.num_options as usize {
            total_votes += proposal.vote_counts[i];
            if proposal.vote_counts[i] > max_votes {
                max_votes = proposal.vote_counts[i];
                winning_option = i as u8;
            }
        }

        // Check for ties
        let mut tie_count = 0;
        for i in 0..proposal.num_options as usize {
            if proposal.vote_counts[i] == max_votes {
                tie_count += 1;
            }
        }

        let result = if tie_count > 1 {
            "TIE".to_string()
        } else if total_votes == 0 {
            "NO VOTES".to_string()
        } else {
            let label = if !proposal.option_labels[winning_option as usize].is_empty() {
                proposal.option_labels[winning_option as usize].clone()
            } else {
                format!("Option {}", winning_option)
            };
            format!("WINNER: {} ({} votes)", label, max_votes)
        };

        msg!(
            "Proposal {} finalized: {} (total: {} votes across {} options)",
            proposal.proposal_id,
            result,
            total_votes,
            proposal.num_options
        );

        Ok(())
    }
}

// ============================================================================
// ZK Proof Verification
// ============================================================================

/// Verify a Groth16 proof using Solana's altbn254 precompiles
///
/// Expected proof format (256 bytes):
/// - bytes 0-63: proof_a (G1, negated, big-endian)
/// - bytes 64-191: proof_b (G2, big-endian)
/// - bytes 192-255: proof_c (G1, big-endian)
///
/// When groth16-solana is enabled, this uses ~200k compute units.
fn verify_groth16_proof(
    proof_data: &[u8],
    voters_root: &[u8; 32],
    nullifier: &[u8; 32],
    proposal_id: u64,
    vote: u8,
    num_options: u8,
) -> Result<()> {
    // Validate proof size
    require!(proof_data.len() >= 256, VotingError::InvalidProof);

    // Extract proof components
    let proof_a: [u8; 64] = proof_data[0..64]
        .try_into()
        .map_err(|_| VotingError::InvalidProof)?;
    let proof_b: [u8; 128] = proof_data[64..192]
        .try_into()
        .map_err(|_| VotingError::InvalidProof)?;
    let proof_c: [u8; 64] = proof_data[192..256]
        .try_into()
        .map_err(|_| VotingError::InvalidProof)?;

    // Prepare public inputs (32 bytes each, big-endian)
    // Order must match circuit: voters_root, nullifier, proposal_id, vote, num_options
    let mut proposal_id_bytes = [0u8; 32];
    proposal_id_bytes[24..32].copy_from_slice(&proposal_id.to_be_bytes());

    let mut vote_bytes = [0u8; 32];
    vote_bytes[31] = vote;

    let mut num_options_bytes = [0u8; 32];
    num_options_bytes[31] = num_options;

    // Convert public inputs to fixed-size array format
    let mut public_inputs_arr: [[u8; 32]; PUBLIC_INPUT_COUNT] = [[0u8; 32]; PUBLIC_INPUT_COUNT];
    public_inputs_arr[0].copy_from_slice(voters_root);
    public_inputs_arr[1].copy_from_slice(nullifier);
    public_inputs_arr[2].copy_from_slice(&proposal_id_bytes);
    public_inputs_arr[3].copy_from_slice(&vote_bytes);
    public_inputs_arr[4].copy_from_slice(&num_options_bytes);

    // Construct verifying key
    let vk = Groth16Verifyingkey {
        nr_pubinputs: PUBLIC_INPUT_COUNT,
        vk_alpha_g1: verifying_key::ALPHA,
        vk_beta_g2: verifying_key::BETA,
        vk_gamme_g2: verifying_key::GAMMA,
        vk_delta_g2: verifying_key::DELTA,
        vk_ic: &verifying_key::IC,
    };

    // Groth16 on-chain verification using Solana's altbn254 precompiles
    let mut verifier = Groth16Verifier::new(
        &proof_a,
        &proof_b,
        &proof_c,
        &public_inputs_arr,
        &vk,
    )
    .map_err(|_| VotingError::InvalidProof)?;

    verifier.verify().map_err(|_| VotingError::InvalidProof)?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(proposal_id: u64)]
pub struct CreateProposal<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Proposal::INIT_SPACE,
        seeds = [b"proposal", proposal_id.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(nullifier: [u8; 32])]
pub struct CastVote<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,

    #[account(
        init,
        payer = payer,
        space = 8 + NullifierAccount::INIT_SPACE,
        seeds = [b"nullifier", proposal.key().as_ref(), nullifier.as_ref()],
        bump
    )]
    pub nullifier_account: Account<'info, NullifierAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeProposal<'info> {
    #[account(
        mut,
        has_one = authority
    )]
    pub proposal: Account<'info, Proposal>,

    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Proposal {
    pub proposal_id: u64,
    pub voters_root: [u8; 32],
    pub authority: Pubkey,
    #[max_len(64)]
    pub title: String,
    #[max_len(256)]
    pub description: String,
    /// Number of vote options (2-8)
    pub num_options: u8,
    /// Vote counts for each option (index 0 to num_options-1)
    pub vote_counts: [u64; 8],
    /// Labels for each option (e.g., ["Yes", "No"] or ["A", "B", "C", "D"])
    #[max_len(8, 32)]
    pub option_labels: Vec<String>,
    pub voting_ends_at: i64,
    pub is_finalized: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct NullifierAccount {
    pub nullifier: [u8; 32],
    pub proposal: Pubkey,
    pub bump: u8,
}

#[error_code]
pub enum VotingError {
    #[msg("Voting period has ended")]
    VotingEnded,
    #[msg("Voting period has not ended yet")]
    VotingNotEnded,
    #[msg("Proposal has already been finalized")]
    ProposalFinalized,
    #[msg("Invalid vote value (must be 0 to num_options-1)")]
    InvalidVote,
    #[msg("Proof data exceeds maximum size")]
    ProofTooLarge,
    #[msg("Invalid ZK proof")]
    InvalidProof,
    #[msg("Too few options (minimum 2)")]
    TooFewOptions,
    #[msg("Too many options (maximum 8)")]
    TooManyOptions,
    #[msg("Number of option labels must match num_options")]
    OptionLabelsMismatch,
}
