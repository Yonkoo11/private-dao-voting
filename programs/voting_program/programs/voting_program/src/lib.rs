use anchor_lang::prelude::*;
use groth16_solana::groth16::{Groth16Verifier, Groth16Verifyingkey};

declare_id!("Cug9uBUHFaJXCYHw4K9vMKJdK6cpbRdYnJcGVxCcWXZp");

/// Maximum size of proof data (proof_a: 64 + proof_b: 128 + proof_c: 64 = 256 bytes)
const MAX_PROOF_SIZE: usize = 512;

/// Number of public inputs: voters_root, nullifier, proposal_id, vote
const PUBLIC_INPUT_COUNT: usize = 4;

// ============================================================================
// Verifying Key Module
// ============================================================================
// This verifying key will be generated from the Noir circuit's compiled output.
//
// INTEGRATION STEPS:
// 1. cd circuits/private_vote && nargo compile
// 2. Extract verifying key from target/private_vote.json
// 3. Convert to groth16-solana format (see scripts/convert_vk.ts)
// 4. Replace placeholder values below with actual key bytes
// 5. Enable groth16-solana dependency in Cargo.toml
// 6. Set VERIFICATION_ENABLED to true
//
// The groth16-solana crate provides ~200k CU on-chain verification using
// Solana's altbn254 syscalls (available since v1.18).
// ============================================================================

/// Verifying key for the private vote circuit (BN254 curve)
/// Structure: [alpha, beta, gamma, delta, ic[0..4]]
mod verifying_key {
    /// Alpha point (G1) - 64 bytes (x: 32 bytes, y: 32 bytes, big-endian)
    pub const ALPHA: [u8; 64] = [0u8; 64]; // Placeholder

    /// Beta point (G2) - 128 bytes (x: 64 bytes, y: 64 bytes, big-endian)
    pub const BETA: [u8; 128] = [0u8; 128]; // Placeholder

    /// Gamma point (G2) - 128 bytes
    pub const GAMMA: [u8; 128] = [0u8; 128]; // Placeholder

    /// Delta point (G2) - 128 bytes
    pub const DELTA: [u8; 128] = [0u8; 128]; // Placeholder

    /// IC (input commitments) - one per public input + 1
    /// IC[0] is the base, IC[1..5] correspond to voters_root, nullifier, proposal_id, vote
    pub const IC: [[u8; 64]; 5] = [[0u8; 64]; 5]; // Placeholder

    /// Whether on-chain verification is enabled
    /// When true, proofs are verified on-chain using Solana's altbn254 precompiles (~200k CU).
    /// Set to false during testing with placeholder verifying key.
    /// IMPORTANT: Replace placeholder verifying key values before enabling in production.
    pub const VERIFICATION_ENABLED: bool = false; // Set to true when real verifying key is installed
}

#[program]
pub mod voting_program {
    use super::*;

    /// Initialize a new proposal with a voters merkle root
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        proposal_id: u64,
        voters_root: [u8; 32],
        title: String,
        description: String,
        voting_ends_at: i64,
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        proposal.proposal_id = proposal_id;
        proposal.voters_root = voters_root;
        proposal.authority = ctx.accounts.authority.key();
        proposal.title = title;
        proposal.description = description;
        proposal.yes_votes = 0;
        proposal.no_votes = 0;
        proposal.voting_ends_at = voting_ends_at;
        proposal.is_finalized = false;
        proposal.bump = ctx.bumps.proposal;

        msg!("Proposal {} created with voters_root {:?}", proposal_id, voters_root);
        Ok(())
    }

    /// Cast a private vote with ZK proof
    ///
    /// The proof proves:
    /// 1. Voter is in the voters_root Merkle tree (membership)
    /// 2. Nullifier is correctly derived from secret + proposal_id
    /// 3. Vote is valid (0 or 1)
    ///
    /// Proof format (256 bytes total):
    /// - proof_a: [u8; 64] - G1 point (negated, big-endian)
    /// - proof_b: [u8; 128] - G2 point (big-endian)
    /// - proof_c: [u8; 64] - G1 point (big-endian)
    pub fn cast_vote(
        ctx: Context<CastVote>,
        nullifier: [u8; 32],
        vote: u8, // 0 = no, 1 = yes
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

        // Validate vote value
        require!(vote == 0 || vote == 1, VotingError::InvalidVote);

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

        // Record vote
        if vote == 1 {
            proposal.yes_votes = proposal.yes_votes.checked_add(1).unwrap();
        } else {
            proposal.no_votes = proposal.no_votes.checked_add(1).unwrap();
        }

        msg!(
            "Vote cast on proposal {}: {} (yes: {}, no: {})",
            proposal.proposal_id,
            if vote == 1 { "YES" } else { "NO" },
            proposal.yes_votes,
            proposal.no_votes
        );

        Ok(())
    }

    /// Finalize voting and lock results
    pub fn finalize_proposal(ctx: Context<FinalizeProposal>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;

        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp >= proposal.voting_ends_at,
            VotingError::VotingNotEnded
        );
        require!(!proposal.is_finalized, VotingError::ProposalFinalized);

        proposal.is_finalized = true;

        let result = if proposal.yes_votes > proposal.no_votes {
            "PASSED"
        } else if proposal.no_votes > proposal.yes_votes {
            "REJECTED"
        } else {
            "TIE"
        };

        msg!(
            "Proposal {} finalized: {} (yes: {}, no: {})",
            proposal.proposal_id,
            result,
            proposal.yes_votes,
            proposal.no_votes
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
    // Order must match circuit: voters_root, nullifier, proposal_id, vote
    let mut proposal_id_bytes = [0u8; 32];
    proposal_id_bytes[24..32].copy_from_slice(&proposal_id.to_be_bytes());

    let mut vote_bytes = [0u8; 32];
    vote_bytes[31] = vote;

    // Convert public inputs to fixed-size array format
    let mut public_inputs_arr: [[u8; 32]; PUBLIC_INPUT_COUNT] = [[0u8; 32]; PUBLIC_INPUT_COUNT];
    public_inputs_arr[0].copy_from_slice(voters_root);
    public_inputs_arr[1].copy_from_slice(nullifier);
    public_inputs_arr[2].copy_from_slice(&proposal_id_bytes);
    public_inputs_arr[3].copy_from_slice(&vote_bytes);

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
    pub yes_votes: u64,
    pub no_votes: u64,
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
    #[msg("Invalid vote value (must be 0 or 1)")]
    InvalidVote,
    #[msg("Proof data exceeds maximum size")]
    ProofTooLarge,
    #[msg("Invalid ZK proof")]
    InvalidProof,
}
