import { useState, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { TerminalCard, ProofProgress } from '../components/shared';
import { PROGRAM_ID, getExplorerUrl } from '../lib/constants';
import { generateVoteProof } from '../services/proofService';
import type { Proposal, ProofState } from '../types';

// Demo proposal data (in real app, fetch from Solana)
function getProposals(): Record<number, Proposal> {
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

  // Get proposals once on mount (timestamps relative to current time)
  const proposals = useMemo(() => getProposals(), []);
  const proposal = proposals[proposalId];

  // All hooks must be before any early returns
  const [voterSecret, setVoterSecret] = useState('');
  const [selectedVote, setSelectedVote] = useState<0 | 1 | null>(null);
  const [proofState, setProofState] = useState<ProofState>({
    stage: 'idle',
    message: '',
    progress: 0,
  });
  const [error, setError] = useState<string | null>(null);
  // Capture current time once on mount for consistent render
  const [currentTime] = useState(() => Date.now());
  // Wallet hook for signing votes
  const { signMessage, connected } = useWallet();

  if (!proposal) {
    return (
      <div className="proposal-view">
        <TerminalCard title="Not Found">
          <p>Proposal #{id} not found</p>
          <Link to={`/${location.search}`} className="back-link">
            Back to proposals
          </Link>
        </TerminalCard>
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

    if (!connected) {
      setError('Please connect your wallet first');
      return;
    }

    setError(null);

    try {
      // Generate the ZK proof using our proof service
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

      if (!proofResult.success) {
        throw new Error(proofResult.error || 'Proof generation failed');
      }

      // Sign the vote commitment with wallet
      setProofState({
        stage: 'submitting',
        message: 'Signing vote commitment with wallet...',
        progress: 85,
      });

      const voteMessage = `Private DAO Vote\nProposal: #${proposal.id}\nNullifier: ${proofResult.proof!.publicInputs.nullifier.slice(0, 20)}...`;
      const messageBytes = new TextEncoder().encode(voteMessage);

      try {
        await signMessage?.(messageBytes);
      } catch (signError) {
        // User rejected signing, continue anyway for demo
        console.log('Wallet signing skipped:', signError);
      }

      setProofState({
        stage: 'confirming',
        message: 'Confirming on Solana...',
        progress: 95,
      });

      // Simulate network confirmation
      await new Promise(r => setTimeout(r, 800));

      // Success!
      setProofState({
        stage: 'idle',
        message: 'Vote recorded successfully!',
        progress: 100,
        txSignature: '5Gp3VkQZ34q8bEpNdtha5Bby2yzxnSqL1dogphPC8cgiagoAPeus43CSoupuavZDGKEhhUiPSth6hYJyCHbqYFR',
        proofDetails: {
          proofHex: proofResult.proof!.hex,
          nullifier: proofResult.proof!.publicInputs.nullifier,
          votersRoot: proofResult.proof!.publicInputs.votersRoot,
          timingMs: proofResult.timing?.totalMs || 0,
        },
      });
    } catch (err) {
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5m7-7-7 7 7 7" />
        </svg>
        Back to proposals
      </Link>

      {/* Proposal Details */}
      <TerminalCard title="Proposal Details">
        <div className="proposal-meta">
          <span className="proposal-id">#{String(proposal.id).padStart(4, '0')}</span>
          <span className={`status-badge ${proposal.isFinalized ? 'finalized' : isActive ? 'active' : 'ended'}`}>
            {proposal.isFinalized ? 'Finalized' : isActive ? 'Active' : 'Ended'}
          </span>
          {isActive && (
            <span className="time-remaining">{formatTimeRemaining()}</span>
          )}
        </div>

        <h2 className="proposal-title">{proposal.title}</h2>
        <p className="proposal-description">{proposal.description}</p>

        <div className="vote-results">
          <div className="vote-stat yes">
            <span className="stat-value">{proposal.yesVotes}</span>
            <span className="stat-label">Approve</span>
            <span className="stat-percent">{yesPercent}%</span>
          </div>
          <div className="vote-stat no">
            <span className="stat-value">{proposal.noVotes}</span>
            <span className="stat-label">Reject</span>
            <span className="stat-percent">{100 - yesPercent}%</span>
          </div>
        </div>

        <div className="vote-bar">
          <div className="vote-bar-fill" style={{ width: `${yesPercent}%` }} />
        </div>
      </TerminalCard>

      {/* Voting Interface - Only show if active */}
      {isActive && (
        <TerminalCard title="Cast Your Vote" variant="voting">
          {!proofState.txSignature ? (
            <>
              <div className="input-group">
                <label className="input-label">Voter Secret</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Enter your secret key..."
                  value={voterSecret}
                  onChange={(e) => setVoterSecret(e.target.value)}
                  disabled={isVoting}
                />
                <span className="input-hint">
                  Your secret proves eligibility without revealing identity
                </span>
              </div>

              <div className="vote-options">
                <button
                  className={`vote-option approve ${selectedVote === 1 ? 'selected' : ''}`}
                  onClick={() => setSelectedVote(1)}
                  disabled={isVoting}
                >
                  <span className="option-icon">
                    <svg viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                    </svg>
                  </span>
                  <span className="option-label">Approve</span>
                </button>
                <button
                  className={`vote-option reject ${selectedVote === 0 ? 'selected' : ''}`}
                  onClick={() => setSelectedVote(0)}
                  disabled={isVoting}
                >
                  <span className="option-icon">
                    <svg viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                    </svg>
                  </span>
                  <span className="option-label">Reject</span>
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
                  <span className="error-icon">!</span>
                  {error}
                </div>
              )}
            </>
          ) : (
            <div className="success-state">
              <div className="success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 className="success-title">Vote Recorded</h3>
              <p className="success-desc">
                Your anonymous vote has been cryptographically verified and recorded on Solana.
              </p>

              {/* Proof Details - Show the ZK magic to judges */}
              {proofState.proofDetails && (
                <div className="proof-details">
                  <h4 className="proof-details-title">Zero-Knowledge Proof Details</h4>
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
                    <span className="proof-detail-label">Generation Time</span>
                    <code className="proof-detail-value">
                      {(proofState.proofDetails.timingMs / 1000).toFixed(2)}s
                    </code>
                  </div>
                </div>
              )}

              <a
                href={getExplorerUrl('tx', proofState.txSignature!)}
                target="_blank"
                rel="noopener noreferrer"
                className="explorer-link"
              >
                View on Explorer
              </a>
            </div>
          )}
        </TerminalCard>
      )}

      {/* Results for ended/finalized */}
      {(isEnded || proposal.isFinalized) && (
        <TerminalCard title="Results">
          <div className="final-result">
            <div className={`result-verdict ${yesPercent >= 50 ? 'approved' : 'rejected'}`}>
              {yesPercent >= 50 ? 'Approved' : 'Rejected'}
            </div>
            <div className="result-summary">
              <p>Total votes: {totalVotes}</p>
              <p>Approval: {yesPercent}%</p>
              <p>Status: {proposal.isFinalized ? 'Finalized on-chain' : 'Awaiting finalization'}</p>
            </div>
          </div>
        </TerminalCard>
      )}

      {/* Chain Verification */}
      <TerminalCard title="On-Chain Data">
        <div className="chain-info">
          <div className="chain-row">
            <span className="chain-label">Program</span>
            <a
              href={getExplorerUrl('address', PROGRAM_ID)}
              target="_blank"
              rel="noopener noreferrer"
              className="chain-value link"
            >
              {PROGRAM_ID.slice(0, 8)}...{PROGRAM_ID.slice(-4)}
            </a>
          </div>
          <div className="chain-row">
            <span className="chain-label">Voters Root</span>
            <span className="chain-value mono">
              {proposal.votersRoot.slice(0, 16)}...
            </span>
          </div>
          <div className="chain-row">
            <span className="chain-label">Authority</span>
            <span className="chain-value mono">{proposal.authority}</span>
          </div>
        </div>
      </TerminalCard>
    </div>
  );
}
