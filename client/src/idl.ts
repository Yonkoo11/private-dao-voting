export const IDL = {
  address: "AjHU1SCz7m4U5UgHW6bopAUTXFPupKYa4VrjsjK95SPX",
  version: "0.1.0",
  name: "voting_program",
  metadata: {
    name: "voting_program",
    version: "0.1.0",
    spec: "0.1.0"
  },
  instructions: [
    {
      name: "createProposal",
      accounts: [
        { name: "proposal", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "proposalId", type: "u64" },
        { name: "votersRoot", type: { array: ["u8", 32] } },
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "votingEndsAt", type: "i64" }
      ]
    },
    {
      name: "castVote",
      accounts: [
        { name: "proposal", isMut: true, isSigner: false },
        { name: "nullifierAccount", isMut: true, isSigner: false },
        { name: "payer", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "nullifier", type: { array: ["u8", 32] } },
        { name: "vote", type: "u8" },
        { name: "proofData", type: "bytes" }
      ]
    },
    {
      name: "finalizeProposal",
      accounts: [
        { name: "proposal", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true }
      ],
      args: []
    }
  ],
  accounts: [
    {
      name: "Proposal",
      discriminator: [26, 94, 189, 187, 116, 136, 53, 33]
    },
    {
      name: "NullifierAccount",
      discriminator: [68, 49, 127, 228, 44, 189, 65, 178]
    }
  ],
  types: [
    {
      name: "Proposal",
      type: {
        kind: "struct",
        fields: [
          { name: "proposalId", type: "u64" },
          { name: "votersRoot", type: { array: ["u8", 32] } },
          { name: "authority", type: "pubkey" },
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "yesVotes", type: "u64" },
          { name: "noVotes", type: "u64" },
          { name: "votingEndsAt", type: "i64" },
          { name: "isFinalized", type: "bool" },
          { name: "bump", type: "u8" }
        ]
      }
    },
    {
      name: "NullifierAccount",
      type: {
        kind: "struct",
        fields: [
          { name: "nullifier", type: { array: ["u8", 32] } },
          { name: "proposal", type: "pubkey" },
          { name: "bump", type: "u8" }
        ]
      }
    }
  ],
  errors: [
    { code: 6000, name: "VotingEnded", msg: "Voting period has ended" },
    { code: 6001, name: "VotingNotEnded", msg: "Voting period has not ended yet" },
    { code: 6002, name: "ProposalFinalized", msg: "Proposal has already been finalized" },
    { code: 6003, name: "InvalidVote", msg: "Invalid vote value (must be 0 or 1)" },
    { code: 6004, name: "ProofTooLarge", msg: "Proof data exceeds maximum size" },
    { code: 6005, name: "InvalidProof", msg: "Invalid ZK proof" }
  ]
} as const;

export type VotingProgram = typeof IDL;
