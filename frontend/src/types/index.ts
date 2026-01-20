// Core types for Private DAO Voting

export interface VoteOption {
  index: number;
  label: string;
  count: number;
}

export interface Proposal {
  id: number;
  title: string;
  description: string;
  authority: string;
  votersRoot: string;
  // Multi-choice voting support
  numOptions: number; // 2-8 (2 = binary yes/no)
  voteCounts: number[]; // Counts for each option
  optionLabels: string[]; // Labels for each option
  // Legacy fields for backwards compatibility
  yesVotes?: number;
  noVotes?: number;
  votingEndsAt: number; // Unix timestamp
  isFinalized: boolean;
  createdAt: number;
  pubkey?: string; // On-chain account address
}

export type ProposalStatus = 'active' | 'ended' | 'finalized';

export interface VoteInput {
  proposalId: number;
  voterSecret: string;
  vote: number; // 0 to numOptions-1
  numOptions: number; // Number of options (default 2)
}

export type ProofStage =
  | 'idle'
  | 'computing_inputs'
  | 'generating_witness'
  | 'proving'
  | 'verifying'
  | 'submitting'
  | 'confirming';

export interface ProofState {
  stage: ProofStage;
  message: string;
  progress: number; // 0-100
  error?: string;
  txSignature?: string;
  proofDetails?: {
    proofHex: string;
    nullifier: string;
    votersRoot: string;
    timingMs: number;
  };
}

export type UserRole = 'voter' | 'authority';

export type FilterType = 'all' | 'active' | 'ended' | 'finalized';

export interface AppContextState {
  proposals: Proposal[];
  isLoading: boolean;
  error: string | null;
  userRole: UserRole;
}

// Threshold Encryption Types
export interface EncryptedVoteData {
  ciphertext: string;  // Hex-encoded ciphertext
  nonce: string;       // Hex-encoded nonce
  tag: string;         // Hex-encoded auth tag
}

export interface CommitteeMember {
  pubkey: string;      // Solana public key
  shareIndex: number;  // Share index (1 to N)
  hasSubmitted: boolean; // Whether they've submitted their share for decryption
}

export interface ThresholdConfig {
  threshold: number;    // M - minimum shares needed
  totalMembers: number; // N - total committee size
  committee: CommitteeMember[];
  encryptionEnabled: boolean;
}

export interface ProposalWithEncryption extends Proposal {
  thresholdConfig?: ThresholdConfig;
  encryptedVotes?: EncryptedVoteData[];
  isDecrypted: boolean;
}
