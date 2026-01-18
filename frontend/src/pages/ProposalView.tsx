import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { ProofProgress } from '../components/shared';
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

export function ProposalView() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const proposalId = parseInt(id || '0');

  // State
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [voterSecret, setVoterSecret] = useState('');
  const [selectedVote, setSelectedVote] = useState<0 | 1 | null>(null);
  const [proofState, setProofState] = useState<ProofState>({
    stage: 'idle',
    message: '',
    progress: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [currentTime] = useState(() => Date.now());

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
          console.log('[ProposalView] Loaded from chain:', chainProposal);
        } else {
          // Fall back to demo data
          const demo = demoProposals[proposalId];
          if (demo) {
            setProposal(demo);
            console.log('[ProposalView] Using demo data');
          }
        }
      } catch (err) {
        console.error('[ProposalView] Failed to load:', err);
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
          <span>Fetching proposal #{id} from Solana...</span>
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
    return `${hours}h ${mins}m remaining`;
  };

  const handleSubmitVote = async () => {
    if (!voterSecret || selectedVote === null) {
      setError('Please enter your voter secret and select a vote');
      return;
    }

    if (!connected || !publicKey || !signTransaction) {
      setError('Please connect your wallet first');
      return;
    }

    setError(null);

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

      console.log('[ProposalView] Proof generated:', {
        proofSize: proofResult.proof.bytes.length,
        nullifier: proofResult.proof.publicInputs.nullifier.slice(0, 20) + '...',
        timing: proofResult.timing,
      });

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

      console.log('[ProposalView] Transaction confirmed:', signature);

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

      // Refresh proposal data
      const updatedProposal = await fetchProposal(proposal.id);
      if (updatedProposal) {
        setProposal(updatedProposal);
      }
    } catch (err) {
      console.error('[ProposalView] Vote failed:', err);
      setError(err instanceof Error ? err.message : 'Vote failed');
      setProofState({
        stage: 'idle',
        message: '',
        progress: 0,
      });
    }
  };

  const isVoting = proofState.stage !== 'idle' && !proofState.txSignature;

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
            <span className="vote-count-value">{proposal.yesVotes}</span> {proposal.yesVotes === 1 ? 'vote' : 'votes'} ({yesPercent}%)
          </span>
          <span className="vote-count-item no">
            <span className="vote-count-value">{proposal.noVotes}</span> {proposal.noVotes === 1 ? 'vote' : 'votes'} ({100 - yesPercent}%)
          </span>
        </div>
      </div>

      {/* Voting Interface - Only show if active */}
      {isActive && (
        <div className="voting-section">
          <h3 className="voting-section-title">Cast Your Vote</h3>

          {!proofState.txSignature ? (
            <>
              <div className="form-group">
                <label className="form-label">Voter Secret</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter your secret key..."
                  value={voterSecret}
                  onChange={(e) => setVoterSecret(e.target.value)}
                  disabled={isVoting}
                />
                <span className="form-hint">
                  Your secret proves eligibility without revealing identity
                </span>
              </div>

              <div className="vote-options">
                <button
                  className={`vote-option approve ${selectedVote === 1 ? 'selected' : ''}`}
                  onClick={() => setSelectedVote(1)}
                  disabled={isVoting}
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
                  disabled={isVoting}
                >
                  <span className="vote-option-icon">
                    <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
                      <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                    </svg>
                  </span>
                  <span className="vote-option-label">Reject</span>
                </button>
              </div>

              {isVoting ? (
                <ProofProgress state={proofState} />
              ) : (
                <button
                  className="submit-btn"
                  onClick={handleSubmitVote}
                  disabled={!voterSecret || selectedVote === null}
                >
                  Submit Vote
                </button>
              )}

              {error && (
                <div className="error-message">
                  <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7.25 4.5a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7.5a1 1 0 100-2 1 1 0 000 2z" />
                  </svg>
                  {error}
                </div>
              )}
            </>
          ) : (
            <div className="success-state">
              <div className="success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 className="success-title">Vote Recorded</h3>
              <p className="success-desc">
                Your anonymous vote has been cryptographically verified and recorded on Solana.
              </p>

              {/* Proof Details */}
              {proofState.proofDetails && (
                <div className="proof-details">
                  <h4 className="proof-details-title">Zero-Knowledge Proof</h4>
                  <div className="proof-detail-row">
                    <span className="proof-detail-label">Nullifier</span>
                    <code className="proof-detail-value">
                      {proofState.proofDetails.nullifier.slice(0, 20)}...
                    </code>
                  </div>
                  <div className="proof-detail-row">
                    <span className="proof-detail-label">Voters Root</span>
                    <code className="proof-detail-value">
                      {proofState.proofDetails.votersRoot.slice(0, 20)}...
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

              <a
                href={getExplorerUrl(proofState.txSignature!)}
                target="_blank"
                rel="noopener noreferrer"
                className="explorer-link"
              >
                View on Explorer
              </a>
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
            <span>Status: {proposal.isFinalized ? 'Finalized on-chain' : 'Awaiting finalization'}</span>
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
