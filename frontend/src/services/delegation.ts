/**
 * Vote Delegation Service for Private DAO Voting
 *
 * Implements a delegation system where voters can delegate their
 * voting power to trusted representatives. Delegations are:
 * - Per-proposal or global (configurable)
 * - Revocable at any time before vote is cast
 * - Transitive-optional (delegates can optionally re-delegate)
 *
 * Privacy is maintained through ZK proofs - the delegate proves
 * they have delegation authority without revealing the delegator.
 */

export interface Delegation {
  id: string;
  delegator: string;      // Delegator's commitment (hashed)
  delegate: string;       // Delegate's public key or commitment
  proposalId: number | null; // null = global delegation
  weight: number;         // Voting weight (default 1)
  createdAt: number;      // Unix timestamp
  expiresAt: number | null; // null = no expiration
  isActive: boolean;
  isUsed: boolean;        // Whether delegate has voted with this
}

export interface DelegationProof {
  delegationId: string;
  proof: Uint8Array;      // ZK proof of delegation authority
  nullifier: string;      // Prevents double-use of delegation
}

/**
 * In-memory delegation store (demo purposes)
 * In production, this would be on-chain or in a decentralized store
 */
class DelegationStore {
  private delegations: Map<string, Delegation> = new Map();
  private byDelegator: Map<string, Set<string>> = new Map();
  private byDelegate: Map<string, Set<string>> = new Map();

  /**
   * Create a new delegation
   */
  create(delegation: Omit<Delegation, 'id' | 'createdAt' | 'isActive' | 'isUsed'>): Delegation {
    const id = this.generateId();
    const newDelegation: Delegation = {
      ...delegation,
      id,
      createdAt: Date.now(),
      isActive: true,
      isUsed: false,
    };

    this.delegations.set(id, newDelegation);

    // Index by delegator
    if (!this.byDelegator.has(delegation.delegator)) {
      this.byDelegator.set(delegation.delegator, new Set());
    }
    this.byDelegator.get(delegation.delegator)!.add(id);

    // Index by delegate
    if (!this.byDelegate.has(delegation.delegate)) {
      this.byDelegate.set(delegation.delegate, new Set());
    }
    this.byDelegate.get(delegation.delegate)!.add(id);

    return newDelegation;
  }

  /**
   * Get delegation by ID
   */
  get(id: string): Delegation | undefined {
    return this.delegations.get(id);
  }

  /**
   * Get all delegations from a delegator
   */
  getByDelegator(delegator: string): Delegation[] {
    const ids = this.byDelegator.get(delegator);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.delegations.get(id)!)
      .filter(d => d.isActive);
  }

  /**
   * Get all delegations to a delegate
   */
  getByDelegate(delegate: string): Delegation[] {
    const ids = this.byDelegate.get(delegate);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.delegations.get(id)!)
      .filter(d => d.isActive);
  }

  /**
   * Revoke a delegation
   */
  revoke(id: string): boolean {
    const delegation = this.delegations.get(id);
    if (!delegation || !delegation.isActive) return false;

    delegation.isActive = false;
    return true;
  }

  /**
   * Mark delegation as used (delegate has voted)
   */
  markUsed(id: string): boolean {
    const delegation = this.delegations.get(id);
    if (!delegation || !delegation.isActive || delegation.isUsed) return false;

    delegation.isUsed = true;
    return true;
  }

  /**
   * Get total voting weight for a delegate on a proposal
   */
  getVotingWeight(delegate: string, proposalId: number): number {
    const delegations = this.getByDelegate(delegate);
    let weight = 1; // Base weight (own vote)

    for (const d of delegations) {
      if (d.isActive && !d.isUsed) {
        // Check if delegation applies to this proposal
        if (d.proposalId === null || d.proposalId === proposalId) {
          // Check expiration
          if (d.expiresAt === null || d.expiresAt > Date.now()) {
            weight += d.weight;
          }
        }
      }
    }

    return weight;
  }

  /**
   * Get all active delegations (for display)
   */
  getAllActive(): Delegation[] {
    return Array.from(this.delegations.values()).filter(d => d.isActive);
  }

  private generateId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton store instance
const store = new DelegationStore();

/**
 * Create a new delegation
 */
export function createDelegation(
  delegatorCommitment: string,
  delegateAddress: string,
  options: {
    proposalId?: number;
    weight?: number;
    expiresAt?: number;
  } = {}
): Delegation {
  return store.create({
    delegator: delegatorCommitment,
    delegate: delegateAddress,
    proposalId: options.proposalId ?? null,
    weight: options.weight ?? 1,
    expiresAt: options.expiresAt ?? null,
  });
}

/**
 * Revoke a delegation
 */
export function revokeDelegation(delegationId: string): boolean {
  return store.revoke(delegationId);
}

/**
 * Get delegations made by a user
 */
export function getDelegationsFrom(delegatorCommitment: string): Delegation[] {
  return store.getByDelegator(delegatorCommitment);
}

/**
 * Get delegations received by a user
 */
export function getDelegationsTo(delegateAddress: string): Delegation[] {
  return store.getByDelegate(delegateAddress);
}

/**
 * Calculate total voting power for a delegate
 */
export function getVotingPower(delegateAddress: string, proposalId: number): number {
  return store.getVotingWeight(delegateAddress, proposalId);
}

/**
 * Mark delegation as used after voting
 */
export function useDelegation(delegationId: string): boolean {
  return store.markUsed(delegationId);
}

/**
 * Get all active delegations in the system
 */
export function getAllDelegations(): Delegation[] {
  return store.getAllActive();
}

/**
 * Check if a delegate can vote on behalf of delegator
 */
export function canVoteFor(
  delegateAddress: string,
  delegatorCommitment: string,
  proposalId: number
): boolean {
  const delegations = store.getByDelegate(delegateAddress);

  for (const d of delegations) {
    if (d.delegator === delegatorCommitment && d.isActive && !d.isUsed) {
      if (d.proposalId === null || d.proposalId === proposalId) {
        if (d.expiresAt === null || d.expiresAt > Date.now()) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Demo: Setup some sample delegations
 */
export function setupDemoDelegations(): Delegation[] {
  const delegations: Delegation[] = [];

  // Create some demo delegations
  delegations.push(createDelegation(
    '0xdemo_delegator_1',
    '0xdemo_delegate_a',
    { weight: 1 }
  ));

  delegations.push(createDelegation(
    '0xdemo_delegator_2',
    '0xdemo_delegate_a',
    { weight: 2 }
  ));

  delegations.push(createDelegation(
    '0xdemo_delegator_3',
    '0xdemo_delegate_b',
    { proposalId: 1, weight: 1 }
  ));

  return delegations;
}

// Export service
export const DelegationService = {
  createDelegation,
  revokeDelegation,
  getDelegationsFrom,
  getDelegationsTo,
  getVotingPower,
  useDelegation,
  getAllDelegations,
  canVoteFor,
  setupDemoDelegations,
};

export default DelegationService;
