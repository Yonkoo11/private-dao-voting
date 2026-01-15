// Core types for Private DAO Voting

export interface Proposal {
  id: number;
  title: string;
  description: string;
  authority: string;
  votersRoot: string;
  yesVotes: number;
  noVotes: number;
  votingEndsAt: number; // Unix timestamp
  isFinalized: boolean;
  createdAt: number;
}

export type ProposalStatus = 'active' | 'ended' | 'finalized';

export interface VoteInput {
  proposalId: number;
  voterSecret: string;
  vote: 0 | 1; // 0 = NO, 1 = YES
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
