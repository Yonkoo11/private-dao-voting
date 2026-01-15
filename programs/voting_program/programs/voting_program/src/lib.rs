use anchor_lang::prelude::*;

declare_id!("AjHU1SCz7m4U5UgHW6bopAUTXFPupKYa4VrjsjK95SPX");

/// Maximum size of proof data (proof + public witness)
const MAX_PROOF_SIZE: usize = 512;

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
    /// The proof proves: voter is in voters_root, nullifier is valid, vote is 0 or 1
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

        // TODO: On-chain ZK proof verification
        // Currently blocked by Solana BPF stack size limits in ark-poly
        // The proof is verified off-chain with `sunspot verify`
        // See: https://github.com/solana-labs/solana/issues/13391
        //
        // When on-chain verification is available, add:
        // verify_groth16_proof(&proof_data, &proposal.voters_root, &nullifier, vote)?;

        msg!("Proof data received: {} bytes (verification pending upstream fix)", proof_data.len());

        // Mark nullifier as used (prevents double voting)
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
