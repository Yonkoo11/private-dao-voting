import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { VotingProgram } from "../target/types/voting_program";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("voting_program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VotingProgram as Program<VotingProgram>;
  const authority = provider.wallet;

  // Test data
  const proposalId = new BN(1);
  const votersRoot = Buffer.alloc(32);
  votersRoot.fill(0xab); // Mock voters root

  let proposalPda: PublicKey;
  let proposalBump: number;

  before(async () => {
    // Derive proposal PDA
    [proposalPda, proposalBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), proposalId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
  });

  describe("create_proposal", () => {
    it("creates a proposal with valid parameters", async () => {
      const title = "Test Proposal";
      const description = "A test proposal for unit testing";
      const votingEndsAt = new BN(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

      const tx = await program.methods
        .createProposal(
          proposalId,
          Array.from(votersRoot),
          title,
          description,
          votingEndsAt
        )
        .accounts({
          proposal: proposalPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Create proposal tx:", tx);

      // Fetch and verify proposal state
      const proposal = await program.account.proposal.fetch(proposalPda);

      expect(proposal.proposalId.toNumber()).to.equal(1);
      expect(proposal.title).to.equal(title);
      expect(proposal.description).to.equal(description);
      expect(proposal.yesVotes.toNumber()).to.equal(0);
      expect(proposal.noVotes.toNumber()).to.equal(0);
      expect(proposal.isFinalized).to.be.false;
      expect(Buffer.from(proposal.votersRoot)).to.deep.equal(votersRoot);
    });

    it("fails to create duplicate proposal", async () => {
      try {
        await program.methods
          .createProposal(
            proposalId,
            Array.from(votersRoot),
            "Duplicate",
            "Should fail",
            new BN(Math.floor(Date.now() / 1000) + 3600)
          )
          .accounts({
            proposal: proposalPda,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        expect.fail("Should have thrown error for duplicate proposal");
      } catch (err) {
        // Expected: account already exists
        expect(err.toString()).to.include("already in use");
      }
    });
  });

  describe("cast_vote", () => {
    const nullifier1 = Buffer.alloc(32);
    nullifier1.fill(0x11);

    const nullifier2 = Buffer.alloc(32);
    nullifier2.fill(0x22);

    let nullifierPda1: PublicKey;
    let nullifierPda2: PublicKey;

    before(async () => {
      [nullifierPda1] = PublicKey.findProgramAddressSync(
        [Buffer.from("nullifier"), proposalPda.toBuffer(), nullifier1],
        program.programId
      );

      [nullifierPda2] = PublicKey.findProgramAddressSync(
        [Buffer.from("nullifier"), proposalPda.toBuffer(), nullifier2],
        program.programId
      );
    });

    it("casts a YES vote with valid proof", async () => {
      const vote = 1; // YES
      const proofData = Buffer.alloc(192); // Mock proof

      const tx = await program.methods
        .castVote(Array.from(nullifier1), vote, proofData)
        .accounts({
          proposal: proposalPda,
          nullifierAccount: nullifierPda1,
          payer: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Cast YES vote tx:", tx);

      // Verify vote recorded
      const proposal = await program.account.proposal.fetch(proposalPda);
      expect(proposal.yesVotes.toNumber()).to.equal(1);
      expect(proposal.noVotes.toNumber()).to.equal(0);

      // Verify nullifier recorded
      const nullifierAccount = await program.account.nullifierAccount.fetch(
        nullifierPda1
      );
      expect(Buffer.from(nullifierAccount.nullifier)).to.deep.equal(nullifier1);
    });

    it("casts a NO vote with valid proof", async () => {
      const vote = 0; // NO
      const proofData = Buffer.alloc(192);

      const tx = await program.methods
        .castVote(Array.from(nullifier2), vote, proofData)
        .accounts({
          proposal: proposalPda,
          nullifierAccount: nullifierPda2,
          payer: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Cast NO vote tx:", tx);

      // Verify vote recorded
      const proposal = await program.account.proposal.fetch(proposalPda);
      expect(proposal.yesVotes.toNumber()).to.equal(1);
      expect(proposal.noVotes.toNumber()).to.equal(1);
    });

    it("rejects double voting with same nullifier", async () => {
      try {
        await program.methods
          .castVote(Array.from(nullifier1), 1, Buffer.alloc(192))
          .accounts({
            proposal: proposalPda,
            nullifierAccount: nullifierPda1,
            payer: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        expect.fail("Should have rejected double vote");
      } catch (err) {
        // Expected: nullifier account already exists
        expect(err.toString()).to.include("already in use");
      }
    });

    it("rejects invalid vote value", async () => {
      const invalidNullifier = Buffer.alloc(32);
      invalidNullifier.fill(0x33);

      const [invalidNullifierPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nullifier"), proposalPda.toBuffer(), invalidNullifier],
        program.programId
      );

      try {
        await program.methods
          .castVote(Array.from(invalidNullifier), 2, Buffer.alloc(192)) // Invalid vote value
          .accounts({
            proposal: proposalPda,
            nullifierAccount: invalidNullifierPda,
            payer: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        expect.fail("Should have rejected invalid vote");
      } catch (err) {
        // Error should indicate invalid vote (error code 6003)
        const errStr = err.toString();
        expect(
          errStr.includes("InvalidVote") || errStr.includes("6003")
        ).to.be.true;
      }
    });

    it("rejects oversized proof data", async () => {
      const oversizedNullifier = Buffer.alloc(32);
      oversizedNullifier.fill(0x44);

      const [oversizedNullifierPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nullifier"), proposalPda.toBuffer(), oversizedNullifier],
        program.programId
      );

      try {
        await program.methods
          .castVote(
            Array.from(oversizedNullifier),
            1,
            Buffer.alloc(600) // Larger than MAX_PROOF_SIZE (512)
          )
          .accounts({
            proposal: proposalPda,
            nullifierAccount: oversizedNullifierPda,
            payer: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        expect.fail("Should have rejected oversized proof");
      } catch (err) {
        // Error should indicate proof too large (error code 6004)
        const errStr = err.toString();
        expect(
          errStr.includes("ProofTooLarge") || errStr.includes("6004") || errStr.includes("RangeError")
        ).to.be.true;
      }
    });
  });

  describe("finalize_proposal", () => {
    it("rejects finalization before deadline", async () => {
      try {
        await program.methods
          .finalizeProposal()
          .accounts({
            proposal: proposalPda,
            authority: authority.publicKey,
          })
          .rpc();

        expect.fail("Should have rejected early finalization");
      } catch (err) {
        // Error should indicate voting not ended (error code 6001)
        const errStr = err.toString();
        expect(
          errStr.includes("VotingNotEnded") || errStr.includes("6001")
        ).to.be.true;
      }
    });
  });

  describe("deadline enforcement", () => {
    const expiredProposalId = new BN(999);
    let expiredProposalPda: PublicKey;

    before(async () => {
      [expiredProposalPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("proposal"),
          expiredProposalId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      // Create an already-expired proposal
      const pastDeadline = new BN(Math.floor(Date.now() / 1000) - 1);

      await program.methods
        .createProposal(
          expiredProposalId,
          Array.from(votersRoot),
          "Expired Proposal",
          "Already past deadline",
          pastDeadline
        )
        .accounts({
          proposal: expiredProposalPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("rejects voting after deadline", async () => {
      const lateNullifier = Buffer.alloc(32);
      lateNullifier.fill(0x55);

      const [lateNullifierPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nullifier"), expiredProposalPda.toBuffer(), lateNullifier],
        program.programId
      );

      try {
        await program.methods
          .castVote(Array.from(lateNullifier), 1, Buffer.alloc(192))
          .accounts({
            proposal: expiredProposalPda,
            nullifierAccount: lateNullifierPda,
            payer: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        expect.fail("Should have rejected late vote");
      } catch (err) {
        expect(err.toString()).to.include("VotingEnded");
      }
    });

    it("allows finalization after deadline", async () => {
      const tx = await program.methods
        .finalizeProposal()
        .accounts({
          proposal: expiredProposalPda,
          authority: authority.publicKey,
        })
        .rpc();

      console.log("Finalize proposal tx:", tx);

      const proposal = await program.account.proposal.fetch(expiredProposalPda);
      expect(proposal.isFinalized).to.be.true;
    });

    it("rejects double finalization", async () => {
      try {
        await program.methods
          .finalizeProposal()
          .accounts({
            proposal: expiredProposalPda,
            authority: authority.publicKey,
          })
          .rpc();

        expect.fail("Should have rejected double finalization");
      } catch (err) {
        expect(err.toString()).to.include("ProposalFinalized");
      }
    });

    it("rejects voting on finalized proposal", async () => {
      // Even with deadline check passing (if it could), finalized check blocks it
      const finalizedNullifier = Buffer.alloc(32);
      finalizedNullifier.fill(0x66);

      const [finalizedNullifierPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("nullifier"),
          expiredProposalPda.toBuffer(),
          finalizedNullifier,
        ],
        program.programId
      );

      try {
        await program.methods
          .castVote(Array.from(finalizedNullifier), 1, Buffer.alloc(192))
          .accounts({
            proposal: expiredProposalPda,
            nullifierAccount: finalizedNullifierPda,
            payer: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        expect.fail("Should have rejected vote on finalized proposal");
      } catch (err) {
        // Could be either VotingEnded or ProposalFinalized depending on check order
        const errStr = err.toString();
        expect(
          errStr.includes("VotingEnded") || errStr.includes("ProposalFinalized")
        ).to.be.true;
      }
    });
  });

  describe("authority checks", () => {
    const unauthorizedProposalId = new BN(888);
    let unauthorizedProposalPda: PublicKey;
    const unauthorized = Keypair.generate();

    before(async () => {
      [unauthorizedProposalPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("proposal"),
          unauthorizedProposalId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      // Create proposal with authority's wallet
      const pastDeadline = new BN(Math.floor(Date.now() / 1000) - 1);

      await program.methods
        .createProposal(
          unauthorizedProposalId,
          Array.from(votersRoot),
          "Authority Test",
          "Testing authority checks",
          pastDeadline
        )
        .accounts({
          proposal: unauthorizedProposalPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("rejects finalization by non-authority", async () => {
      try {
        await program.methods
          .finalizeProposal()
          .accounts({
            proposal: unauthorizedProposalPda,
            authority: unauthorized.publicKey,
          })
          .signers([unauthorized])
          .rpc();

        expect.fail("Should have rejected unauthorized finalization");
      } catch (err) {
        expect(err.toString()).to.include("ConstraintHasOne");
      }
    });
  });
});
