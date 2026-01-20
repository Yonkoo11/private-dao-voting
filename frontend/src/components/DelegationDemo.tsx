/**
 * Vote Delegation Demo Component
 *
 * Demonstrates the delegation system where voters can delegate
 * their voting power to trusted representatives.
 */

import { useState } from 'react';
import {
  DelegationService,
  type Delegation,
} from '../services/delegation';

interface DemoState {
  step: 'overview' | 'delegate' | 'manage' | 'vote';
  delegations: Delegation[];
  myCommitment: string;
  myAddress: string;
}

export function DelegationDemo() {
  const [state, setState] = useState<DemoState>({
    step: 'overview',
    delegations: [],
    myCommitment: '',
    myAddress: '',
  });

  const [delegateAddress, setDelegateAddress] = useState('');
  const [delegationWeight, setDelegationWeight] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize demo with sample data
  const initializeDemo = () => {
    const myCommitment = `0xuser_${Math.random().toString(36).substr(2, 8)}`;
    const myAddress = `0xaddr_${Math.random().toString(36).substr(2, 8)}`;

    // Setup demo delegations
    DelegationService.setupDemoDelegations();

    setState({
      step: 'overview',
      delegations: DelegationService.getAllDelegations(),
      myCommitment,
      myAddress,
    });
  };

  // Create a new delegation
  const createDelegation = () => {
    if (!delegateAddress.trim()) return;

    setIsProcessing(true);

    DelegationService.createDelegation(
      state.myCommitment,
      delegateAddress,
      { weight: delegationWeight }
    );

    setState({
      ...state,
      delegations: DelegationService.getAllDelegations(),
      step: 'manage',
    });

    setDelegateAddress('');
    setDelegationWeight(1);
    setIsProcessing(false);
  };

  // Revoke a delegation
  const revokeDelegation = (id: string) => {
    DelegationService.revokeDelegation(id);
    setState({
      ...state,
      delegations: DelegationService.getAllDelegations(),
    });
  };

  // Get delegations I've made
  const myDelegations = state.delegations.filter(
    d => d.delegator === state.myCommitment
  );

  // Get delegations I've received
  const receivedDelegations = state.delegations.filter(
    d => d.delegate === state.myAddress
  );

  // Calculate my voting power
  const myVotingPower = 1 + receivedDelegations.reduce((sum, d) => sum + d.weight, 0);

  // Reset demo
  const reset = () => {
    setState({
      step: 'overview',
      delegations: [],
      myCommitment: '',
      myAddress: '',
    });
  };

  return (
    <div className="delegation-demo">
      <div className="delegation-demo-header">
        <h3>Vote Delegation Demo</h3>
        <p className="delegation-demo-subtitle">
          Delegate your voting power to trusted representatives
        </p>
      </div>

      {/* Not initialized */}
      {!state.myCommitment && (
        <div className="delegation-init">
          <p>
            Vote delegation allows you to transfer your voting power to another
            address. This is useful when you can't participate directly but want
            your voice represented.
          </p>

          <div className="delegation-features">
            <div className="delegation-feature">
              <h4>Flexible Delegation</h4>
              <p>Delegate globally or per-proposal</p>
            </div>
            <div className="delegation-feature">
              <h4>Weighted Votes</h4>
              <p>Delegates accumulate voting power</p>
            </div>
            <div className="delegation-feature">
              <h4>Revocable</h4>
              <p>Cancel delegation anytime before vote</p>
            </div>
          </div>

          <button className="delegation-btn primary" onClick={initializeDemo}>
            Start Demo
          </button>
        </div>
      )}

      {/* Initialized - show tabs */}
      {state.myCommitment && (
        <>
          {/* Navigation tabs */}
          <div className="delegation-tabs">
            <button
              className={`delegation-tab ${state.step === 'overview' ? 'active' : ''}`}
              onClick={() => setState({ ...state, step: 'overview' })}
            >
              Overview
            </button>
            <button
              className={`delegation-tab ${state.step === 'delegate' ? 'active' : ''}`}
              onClick={() => setState({ ...state, step: 'delegate' })}
            >
              Delegate
            </button>
            <button
              className={`delegation-tab ${state.step === 'manage' ? 'active' : ''}`}
              onClick={() => setState({ ...state, step: 'manage' })}
            >
              Manage
            </button>
            <button
              className={`delegation-tab ${state.step === 'vote' ? 'active' : ''}`}
              onClick={() => setState({ ...state, step: 'vote' })}
            >
              Vote
            </button>
          </div>

          {/* Overview tab */}
          {state.step === 'overview' && (
            <div className="delegation-step">
              <div className="delegation-stats">
                <div className="delegation-stat">
                  <span className="stat-value">{myVotingPower}</span>
                  <span className="stat-label">Your Voting Power</span>
                </div>
                <div className="delegation-stat">
                  <span className="stat-value">{myDelegations.length}</span>
                  <span className="stat-label">Delegations Made</span>
                </div>
                <div className="delegation-stat">
                  <span className="stat-value">{receivedDelegations.length}</span>
                  <span className="stat-label">Delegations Received</span>
                </div>
                <div className="delegation-stat">
                  <span className="stat-value">{state.delegations.length}</span>
                  <span className="stat-label">Total Active</span>
                </div>
              </div>

              <div className="delegation-identity">
                <div className="identity-item">
                  <span className="identity-label">Your Commitment</span>
                  <code>{state.myCommitment}</code>
                </div>
                <div className="identity-item">
                  <span className="identity-label">Your Address</span>
                  <code>{state.myAddress}</code>
                </div>
              </div>

              <div className="delegation-info">
                <h4>How Delegation Works</h4>
                <ol>
                  <li>Choose a trusted delegate address</li>
                  <li>Create a delegation with optional weight</li>
                  <li>Your delegate votes with combined power</li>
                  <li>Revoke anytime before vote is cast</li>
                </ol>
              </div>
            </div>
          )}

          {/* Delegate tab */}
          {state.step === 'delegate' && (
            <div className="delegation-step">
              <h4>Create New Delegation</h4>
              <p>Delegate your voting power to a trusted address.</p>

              <div className="delegation-form">
                <div className="form-field">
                  <label>Delegate Address</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={delegateAddress}
                    onChange={(e) => setDelegateAddress(e.target.value)}
                  />
                  <span className="field-hint">
                    The address that will vote on your behalf
                  </span>
                </div>

                <div className="form-field">
                  <label>Voting Weight</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={delegationWeight}
                    onChange={(e) => setDelegationWeight(parseInt(e.target.value) || 1)}
                  />
                  <span className="field-hint">
                    How many votes to delegate (1-10)
                  </span>
                </div>

                <div className="delegation-preview">
                  <span>Preview:</span>
                  <p>
                    You will delegate <strong>{delegationWeight}</strong> vote(s) to{' '}
                    <code>{delegateAddress || '...'}</code>
                  </p>
                </div>

                <button
                  className="delegation-btn primary"
                  onClick={createDelegation}
                  disabled={!delegateAddress.trim() || isProcessing}
                >
                  {isProcessing ? 'Creating...' : 'Create Delegation'}
                </button>
              </div>

              <div className="quick-delegates">
                <h5>Quick Select (Demo)</h5>
                <div className="quick-delegate-list">
                  <button
                    className="quick-delegate"
                    onClick={() => setDelegateAddress('0xdemo_delegate_a')}
                  >
                    Alice (0xdemo_delegate_a)
                  </button>
                  <button
                    className="quick-delegate"
                    onClick={() => setDelegateAddress('0xdemo_delegate_b')}
                  >
                    Bob (0xdemo_delegate_b)
                  </button>
                  <button
                    className="quick-delegate"
                    onClick={() => setDelegateAddress('0xdemo_delegate_c')}
                  >
                    Charlie (0xdemo_delegate_c)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Manage tab */}
          {state.step === 'manage' && (
            <div className="delegation-step">
              <h4>Your Delegations</h4>

              {myDelegations.length === 0 ? (
                <div className="no-delegations">
                  <p>You haven't delegated any votes yet.</p>
                  <button
                    className="delegation-btn secondary"
                    onClick={() => setState({ ...state, step: 'delegate' })}
                  >
                    Create Delegation
                  </button>
                </div>
              ) : (
                <div className="delegation-list">
                  {myDelegations.map((d) => (
                    <div key={d.id} className="delegation-item">
                      <div className="delegation-item-header">
                        <span className="delegation-to">
                          To: <code>{d.delegate}</code>
                        </span>
                        <span className={`delegation-status ${d.isUsed ? 'used' : 'active'}`}>
                          {d.isUsed ? 'Used' : 'Active'}
                        </span>
                      </div>
                      <div className="delegation-item-details">
                        <span>Weight: {d.weight}</span>
                        <span>Scope: {d.proposalId ? `Proposal #${d.proposalId}` : 'Global'}</span>
                        <span>Created: {new Date(d.createdAt).toLocaleDateString()}</span>
                      </div>
                      {!d.isUsed && (
                        <button
                          className="delegation-btn small danger"
                          onClick={() => revokeDelegation(d.id)}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <h4 style={{ marginTop: '2rem' }}>Received Delegations</h4>

              {receivedDelegations.length === 0 ? (
                <div className="no-delegations">
                  <p>No one has delegated votes to you yet.</p>
                </div>
              ) : (
                <div className="delegation-list">
                  {receivedDelegations.map((d) => (
                    <div key={d.id} className="delegation-item received">
                      <div className="delegation-item-header">
                        <span className="delegation-from">
                          From: <code>{d.delegator}</code>
                        </span>
                        <span className="delegation-weight">+{d.weight} votes</span>
                      </div>
                      <div className="delegation-item-details">
                        <span>Scope: {d.proposalId ? `Proposal #${d.proposalId}` : 'Global'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vote tab */}
          {state.step === 'vote' && (
            <div className="delegation-step">
              <h4>Vote with Delegated Power</h4>

              <div className="voting-power-display">
                <div className="power-circle">
                  <span className="power-value">{myVotingPower}</span>
                  <span className="power-label">Total Power</span>
                </div>
                <div className="power-breakdown">
                  <div className="power-item">
                    <span>Your vote</span>
                    <span>1</span>
                  </div>
                  {receivedDelegations.map((d) => (
                    <div key={d.id} className="power-item">
                      <span>From {d.delegator.slice(0, 12)}...</span>
                      <span>+{d.weight}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="vote-simulation">
                <h5>Simulate Vote (Demo)</h5>
                <p>
                  When you vote, your vote will count as{' '}
                  <strong>{myVotingPower} vote(s)</strong> due to delegations.
                </p>

                <div className="vote-options">
                  <button className="vote-option approve">
                    Approve ({myVotingPower} votes)
                  </button>
                  <button className="vote-option reject">
                    Reject ({myVotingPower} votes)
                  </button>
                </div>

                <p className="vote-note">
                  After voting, delegations used will be marked as "used" and
                  cannot be reused for this proposal.
                </p>
              </div>
            </div>
          )}

          {/* Reset button */}
          <div className="delegation-footer">
            <button className="delegation-btn secondary" onClick={reset}>
              Reset Demo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
