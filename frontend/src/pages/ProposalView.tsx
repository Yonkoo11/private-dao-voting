import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { PROGRAM_ID } from '../lib/constants';
import { generateVoteProof } from '../services/proofService';
import {
  fetchProposal,
  submitVoteTransaction,
  getExplorerUrl,
  isNullifierUsed,
} from '../services/solanaService';
import type { Proposal, ProofState } from '../types';

// Demo proposal data (fallback if chain fetch fails)
function getDemoProposals(): Record<number, Proposal> {
  const now = Date.now();
  return {
    1: {
      id: 1,
      title: 'Treasury Allocation Q1 2026',
      description: 'Allocate 1000 SOL from the DAO treasury to the core development fund for protocol improvements and security audits.',
      authority: 'DaoAuth1234...xyz',
      votersRoot: '0x7f3a8b2c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
      yesVotes: 12,
      noVotes: 3,
      votingEndsAt: now - 3600000,
      isFinalized: true,
      createdAt: now - 86400000 * 3,
    },
    2: {
      id: 2,
      title: 'Community Grant Program',
      description: 'Establish a 500 SOL grant program to fund community-driven development initiatives and educational content.',
      authority: 'DaoAuth1234...xyz',
      votersRoot: '0x7f3a8b2c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
      yesVotes: 8,
      noVotes: 5,
      votingEndsAt: now - 1800000,
      isFinalized: false,
      createdAt: now - 86400000 * 2,
    },
    3: {
      id: 3,
      title: 'Protocol Fee Adjustment',
      description: 'Reduce protocol fees from 0.3% to 0.1% to increase competitiveness and attract more users to the platform.',
      authority: 'DaoAuth1234...xyz',
      votersRoot: '0x7f3a8b2c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
      yesVotes: 1,
      noVotes: 0,
      votingEndsAt: now + 3600000,
      isFinalized: false,
      createdAt: now - 86400000,
    },
    4: {
      id: 4,
      title: 'Governance Token Distribution',
      description: 'Approve the distribution of 10,000 governance tokens to early contributors and active community members.',
      authority: 'DaoAuth1234...xyz',
      votersRoot: '0x7f3a8b2c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
      yesVotes: 0,
      noVotes: 0,
      votingEndsAt: now + 86400000,
      isFinalized: false,
      createdAt: now - 3600000,
    },
  };
}

type WizardStep = 'secret' | 'vote' | 'proof' | 'success';

export function ProposalView() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const proposalId = parseInt(id || '0');

  // State
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [voterSecret, setVoterSecret] = useState('');
  const [selectedVote, setSelectedVote] = useState<0 | 1 | null>(null);
  const [wizardStep, setWizardStep] = useState<WizardStep>('secret');
  const [proofState, setProofState] = useState<ProofState>({
    stage: 'idle',
    message: '',
    progress: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Update currentTime every minute to keep status accurate
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Wallet
  const { publicKey, signTransaction, connected } = useWallet();

  // Demo proposals fallback
  const demoProposals = useMemo(() => getDemoProposals(), []);

  // Fetch proposal from chain or use demo
  useEffect(() => {
    async function loadProposal() {
      setLoading(true);
      try {
        const chainProposal = await fetchProposal(proposalId);
        if (chainProposal) {
          setProposal(chainProposal);
        } else {
          // Fall back to demo data
          const demo = demoProposals[proposalId];
          if (demo) {
            setProposal(demo);
          }
        }
      } catch {
        const demo = demoProposals[proposalId];
        if (demo) setProposal(demo);
      } finally {
        setLoading(false);
      }
    }
    loadProposal();
  }, [proposalId, demoProposals]);

  if (loading) {
    return (
      <div className="proposal-view">
        <div className="loading-state">
          <span>Loading proposal...</span>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="proposal-view">
        <Link to={`/${location.search}`} className="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M19 12H5m7-7-7 7 7 7" />
          </svg>
          Back to proposals
        </Link>
        <div className="error-panel">
          <h3>Proposal not found</h3>
          <p>Proposal #{id} does not exist.</p>
        </div>
      </div>
    );
  }

  const isActive = !proposal.isFinalized && currentTime < proposal.votingEndsAt;
  const isEnded = !proposal.isFinalized && currentTime >= proposal.votingEndsAt;
  const totalVotes = proposal.yesVotes + proposal.noVotes;
  const yesPercent = totalVotes > 0 ? Math.round((proposal.yesVotes / totalVotes) * 100) : 0;

  const formatTimeRemaining = () => {
    const diff = proposal.votingEndsAt - currentTime;
    if (diff <= 0) return 'Voting ended';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h left`;
    }
    return `${hours}h ${mins}m left`;
  };

  const handleContinueToVote = () => {
    if (!voterSecret) {
      setError('Please enter your voter secret');
      return;
    }
    setError(null);
    setWizardStep('vote');
  };

  const handleSubmitVote = async () => {
    if (selectedVote === null) {
      setError('Please select a vote');
      return;
    }

    if (!connected || !publicKey || !signTransaction) {
      setError('Please connect your wallet first');
      return;
    }

    setError(null);
    setWizardStep('proof');

    try {
      // Stage 1: Generate the ZK proof
      const proofResult = await generateVoteProof(
        {
          voterSecret,
          proposalId: proposal.id,
          vote: selectedVote === 1,
        },
        (stage, message, progress) => {
          setProofState({
            stage: stage as ProofState['stage'],
            message,
            progress,
          });
        }
      );

      if (!proofResult.success || !proofResult.proof) {
        throw new Error(proofResult.error || 'Proof generation failed');
      }

      // Stage 2: Check if nullifier already used
      setProofState({
        stage: 'submitting',
        message: 'Checking vote eligibility...',
        progress: 82,
      });

      const alreadyVoted = await isNullifierUsed(proofResult.proof.nullifierBytes);
      if (alreadyVoted) {
        throw new Error('You have already voted on this proposal');
      }

      // Stage 3: Submit transaction to Solana
      setProofState({
        stage: 'submitting',
        message: 'Submitting vote to Solana...',
        progress: 85,
      });

      const signature = await submitVoteTransaction(
        publicKey,
        proposal.id,
        selectedVote === 1,
        proofResult.proof.nullifierBytes,
        proofResult.proof.bytes,
        signTransaction
      );

      // Stage 4: Success!
      setProofState({
        stage: 'idle',
        message: 'Vote recorded successfully!',
        progress: 100,
        txSignature: signature,
        proofDetails: {
          proofHex: proofResult.proof.hex,
          nullifier: proofResult.proof.publicInputs.nullifier,
          votersRoot: proofResult.proof.publicInputs.votersRoot,
          timingMs: proofResult.timing?.totalMs || 0,
        },
      });

      setWizardStep('success');

      // Refresh proposal data
      const updatedProposal = await fetchProposal(proposal.id);
      if (updatedProposal) {
        setProposal(updatedProposal);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vote failed');
      setWizardStep('vote');
      setProofState({
        stage: 'idle',
        message: '',
        progress: 0,
      });
    }
  };

  const getWizardStepNumber = (): number => {
    switch (wizardStep) {
      case 'secret': return 1;
      case 'vote': return 2;
      case 'proof': return 3;
      case 'success': return 4;
      default: return 1;
    }
  };

  return (
    <div className="proposal-view">
      <Link to={`/${location.search}`} className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <path d="M19 12H5m7-7-7 7 7 7" />
        </svg>
        Back to proposals
      </Link>

      {/* Proposal Header */}
      <div className="proposal-header">
        <div className="proposal-header-top">
          <span className="proposal-id">#{String(proposal.id).padStart(4, '0')}</span>
          <span className={`status-badge ${proposal.isFinalized ? 'finalized' : isActive ? 'active' : 'ended'}`}>
            {proposal.isFinalized ? 'Finalized' : isActive ? 'Active' : 'Ended'}
          </span>
          {isActive && (
            <span className="time-badge">{formatTimeRemaining()}</span>
          )}
        </div>
        <h1>{proposal.title}</h1>
      </div>

      <p className="proposal-description">{proposal.description}</p>

      {/* Vote Progress */}
      <div className="vote-progress-container">
        <div className="vote-progress-header">
          <span className="vote-progress-label">Approve</span>
          <span className="vote-progress-label">Reject</span>
        </div>
        <div className="vote-progress-bar">
          <div className="vote-progress-yes" style={{ width: `${yesPercent}%` }} />
          <div className="vote-progress-no" style={{ width: `${100 - yesPercent}%` }} />
        </div>
        <div className="vote-counts">
          <span className="vote-count-item yes">
            <span className="vote-count-value">{proposal.yesVotes}</span> votes ({yesPercent}%)
          </span>
          <span className="vote-count-item no">
            <span className="vote-count-value">{proposal.noVotes}</span> votes ({100 - yesPercent}%)
          </span>
        </div>
      </div>

      {/* Voting Wizard - Only show if active */}
      {isActive && (
        <div className="voting-section">
          <h3 className="voting-section-title">Cast Your Vote</h3>

          {/* Step indicator */}
          <div className="wizard-steps">
            <div className={`wizard-step ${getWizardStepNumber() >= 1 ? 'completed' : ''} ${getWizardStepNumber() === 1 ? 'active' : ''}`} />
            <div className={`wizard-step ${getWizardStepNumber() >= 2 ? 'completed' : ''} ${getWizardStepNumber() === 2 ? 'active' : ''}`} />
            <div className={`wizard-step ${getWizardStepNumber() >= 3 ? 'completed' : ''} ${getWizardStepNumber() === 3 ? 'active' : ''}`} />
            <div className={`wizard-step ${getWizardStepNumber() >= 4 ? 'completed' : ''}`} />
          </div>

          {/* Step 1: Secret Entry */}
          {wizardStep === 'secret' && (
            <div className="wizard-content">
              <div className="form-group">
                <label className="form-label">Voter Secret</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter your secret key..."
                  value={voterSecret}
                  onChange={(e) => setVoterSecret(e.target.value)}
                  autoFocus
                />
                <span className="form-hint">
                  Your secret proves eligibility without revealing identity
                </span>
              </div>

              <button
                className="submit-btn"
                onClick={handleContinueToVote}
                disabled={!voterSecret}
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Vote Selection */}
          {wizardStep === 'vote' && (
            <div className="wizard-content">
              <div className="vote-options" role="group" aria-label="Vote options">
                <button
                  className={`vote-option approve ${selectedVote === 1 ? 'selected' : ''}`}
                  onClick={() => setSelectedVote(1)}
                  aria-pressed={selectedVote === 1}
                >
                  <span className="vote-option-icon">
                    <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                    </svg>
                  </span>
                  <span className="vote-option-label">Approve</span>
                </button>
                <button
                  className={`vote-option reject ${selectedVote === 0 ? 'selected' : ''}`}
                  onClick={() => setSelectedVote(0)}
                  aria-pressed={selectedVote === 0}
                >
                  <span className="vote-option-icon">
                    <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
                      <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                    </svg>
                  </span>
                  <span className="vote-option-label">Reject</span>
                </button>
              </div>

              <p className="form-hint" style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
                Your vote is private and cannot be traced back to you
              </p>

              <button
                className="submit-btn"
                onClick={handleSubmitVote}
                disabled={selectedVote === null}
              >
                Submit Vote
              </button>
            </div>
          )}

          {/* Step 3: Proof Generation */}
          {wizardStep === 'proof' && (
            <div className="wizard-content">
              <div className="proof-generation">
                <h4 className="proof-generation-title">Generating ZK Proof</h4>
                <p className="proof-generation-subtitle">Your identity stays hidden</p>

                <div className="proof-progress-wrapper">
                  <div className="proof-progress-bar">
                    <div
                      className="proof-progress-fill"
                      style={{ width: `${proofState.progress}%` }}
                    />
                  </div>
                  <span className="proof-progress-text">{proofState.progress}%</span>
                </div>

                <p className="proof-stage">{proofState.message}</p>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {wizardStep === 'success' && (
            <div className="wizard-content">
              <div className="success-state">
                <div className="success-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="success-title">Vote Recorded</h3>
                <p className="success-desc">
                  Your anonymous vote has been verified and recorded on Solana.
                </p>

                {proofState.proofDetails && (
                  <div className="proof-details">
                    <h4 className="proof-details-title">Zero-Knowledge Proof</h4>
                    <div className="proof-detail-row">
                      <span className="proof-detail-label">Nullifier</span>
                      <code className="proof-detail-value">
                        {proofState.proofDetails.nullifier.slice(0, 16)}...
                      </code>
                    </div>
                    <div className="proof-detail-row">
                      <span className="proof-detail-label">Proof Size</span>
                      <code className="proof-detail-value">
                        {Math.round(proofState.proofDetails.proofHex.length / 2)} bytes
                      </code>
                    </div>
                    <div className="proof-detail-row">
                      <span className="proof-detail-label">Gen Time</span>
                      <code className="proof-detail-value">
                        {(proofState.proofDetails.timingMs / 1000).toFixed(2)}s
                      </code>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                  <a
                    href={getExplorerUrl(proofState.txSignature!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
                  >
                    View on Explorer
                  </a>
                  <Link to={`/${location.search}`} className="explorer-link">
                    Back to Proposals
                  </Link>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7.25 4.5a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7.5a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Results for ended/finalized */}
      {(isEnded || proposal.isFinalized) && (
        <div className="results-section">
          <h3 className="results-title">Final Results</h3>
          <div className={`result-verdict ${yesPercent >= 50 ? 'approved' : 'rejected'}`}>
            {yesPercent >= 50 ? 'Approved' : 'Rejected'}
          </div>
          <div className="result-summary">
            <span>Total votes: {totalVotes}</span>
            <span>Approval: {yesPercent}%</span>
            <span>{proposal.isFinalized ? 'Finalized on-chain' : 'Awaiting finalization'}</span>
          </div>
        </div>
      )}

      {/* On-Chain Data */}
      <div className="chain-section">
        <h3 className="chain-section-title">On-Chain Data</h3>
        <div className="chain-info">
          <div className="chain-row">
            <span className="chain-label">Program</span>
            <a
              href={`https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="chain-value link"
            >
              {PROGRAM_ID.slice(0, 8)}...{PROGRAM_ID.slice(-4)}
            </a>
          </div>
          <div className="chain-row">
            <span className="chain-label">Voters Root</span>
            <code className="chain-value mono">
              {proposal.votersRoot.slice(0, 16)}...
            </code>
          </div>
          <div className="chain-row">
            <span className="chain-label">Authority</span>
            <code className="chain-value mono">{proposal.authority}</code>
          </div>
        </div>
      </div>
    </div>
  );
}
