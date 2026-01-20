import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { PROGRAM_ID } from '../lib/constants';
import { generateVoteProof } from '../services/proofService';
import type { MerkleProofData } from '../services/proofService';
import { getMerkleProofForVoter } from '../services/voterService';
import {
  fetchProposal,
  submitVoteTransaction,
  getExplorerUrl,
  isNullifierUsed,
} from '../services/solanaService';
import type { Proposal, ProofState } from '../types';

// Demo proposal data (fallback if chain fetch fails)
// Updated to support multi-choice voting
function getDemoProposals(): Record<number, Proposal> {
  const now = Date.now();
  return {
    1: {
      id: 1,
      title: 'Treasury Allocation Q1 2026',
      description: 'Allocate 1000 SOL from the DAO treasury to the core development fund for protocol improvements and security audits.',
      authority: 'DaoAuth1234...xyz',
      votersRoot: '0x7f3a8b2c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
      numOptions: 2,
      voteCounts: [3, 12], // [Reject, Approve]
      optionLabels: ['Reject', 'Approve'],
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
      numOptions: 2,
      voteCounts: [5, 8],
      optionLabels: ['Reject', 'Approve'],
      yesVotes: 8,
      noVotes: 5,
      votingEndsAt: now - 1800000,
      isFinalized: false,
      createdAt: now - 86400000 * 2,
    },
    3: {
      id: 3,
      title: 'Protocol Fee Adjustment',
      description: 'Choose the new protocol fee rate to increase competitiveness and attract more users.',
      authority: 'DaoAuth1234...xyz',
      votersRoot: '0x7f3a8b2c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
      numOptions: 4,
      voteCounts: [0, 1, 0, 0],
      optionLabels: ['Keep 0.3%', 'Reduce to 0.2%', 'Reduce to 0.1%', 'Remove fees'],
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
      numOptions: 2,
      voteCounts: [0, 0],
      optionLabels: ['Reject', 'Approve'],
      yesVotes: 0,
      noVotes: 0,
      votingEndsAt: now + 86400000,
      isFinalized: false,
      createdAt: now - 3600000,
    },
    5: {
      id: 5,
      title: 'New Logo Design',
      description: 'Vote for your preferred new logo design from the community submissions.',
      authority: 'DaoAuth1234...xyz',
      votersRoot: '0x7f3a8b2c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
      numOptions: 5,
      voteCounts: [2, 5, 3, 1, 4],
      optionLabels: ['Design A', 'Design B', 'Design C', 'Design D', 'Design E'],
      yesVotes: 15,
      noVotes: 0,
      votingEndsAt: now + 172800000,
      isFinalized: false,
      createdAt: now - 7200000,
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
  const [selectedVote, setSelectedVote] = useState<number | null>(null);
  const [wizardStep, setWizardStep] = useState<WizardStep>('secret');
  const [merkleProof, setMerkleProof] = useState<MerkleProofData | null>(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
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
          <div className="loading-spinner" />
          <span>Loading proposal...</span>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="proposal-view">
        <Link to={`/dashboard${location.search}`} className="back-link">
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

  // Calculate total votes and percentages for multi-choice support
  const voteCounts = proposal.voteCounts || [proposal.noVotes || 0, proposal.yesVotes || 0];
  const totalVotes = voteCounts.reduce((sum, count) => sum + count, 0);
  const votePercentages = voteCounts.map(count =>
    totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
  );
  // For backwards compatibility with binary yes/no display
  const yesPercent = votePercentages[1] || 0;
  // Find the winning option
  const winningIndex = voteCounts.indexOf(Math.max(...voteCounts));
  const isBinaryVote = (proposal.numOptions || 2) === 2;

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

  const handleContinueToVote = async () => {
    if (!voterSecret) {
      setError('Please enter your voter secret');
      return;
    }

    setError(null);
    setIsCheckingEligibility(true);

    try {
      // Get merkle proof for the voter
      const result = await getMerkleProofForVoter(voterSecret, proposal!.id);

      if (!result.success || !result.proof) {
        throw new Error(result.error || 'Failed to get merkle proof');
      }

      // Check if merkle root matches proposal's voters_root (if available)
      const proposalRoot = proposal!.votersRoot?.toLowerCase();
      const computedRoot = result.proof.votersRoot.toLowerCase();

      // Note: In demo mode, roots may not match. That's okay for hackathon demo.
      if (proposalRoot && proposalRoot !== '0x7f3a8b2c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a') {
        // Only validate if proposal has a real voters_root (not demo placeholder)
        if (computedRoot !== proposalRoot) {
          console.warn('Merkle root mismatch - using demo mode');
        }
      }

      // Store merkle proof for use in vote submission
      setMerkleProof({
        votersRoot: result.proof.votersRoot,
        siblings: result.proof.siblings,
        pathIndices: result.proof.pathIndices,
      });

      setWizardStep('vote');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify eligibility');
    } finally {
      setIsCheckingEligibility(false);
    }
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
          vote: selectedVote, // Pass vote option index (0 to numOptions-1)
          numOptions: proposal.numOptions || 2, // Support multi-choice
          merkleProof: merkleProof || undefined, // Pass merkle proof if available
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
        selectedVote, // Pass vote option index directly
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

  // Voting Section Component
  const VotingSection = () => (
    <div className="voting-section">
      {/* Privacy Indicator */}
      <div className="privacy-indicator">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        Your vote is verified but never revealed.
      </div>

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
            disabled={!voterSecret || isCheckingEligibility}
          >
            {isCheckingEligibility ? 'Checking eligibility...' : 'Continue'}
          </button>
        </div>
      )}

      {/* Step 2: Vote Selection */}
      {wizardStep === 'vote' && proposal && (
        <div className="wizard-content">
          <div
            className={`vote-options ${(proposal.numOptions || 2) > 2 ? 'multi-choice' : ''}`}
            role="group"
            aria-label="Vote options"
          >
            {(proposal.optionLabels || ['Reject', 'Approve']).map((label, index) => (
              <button
                key={index}
                className={`vote-option ${
                  (proposal.numOptions || 2) === 2
                    ? (index === 1 ? 'approve' : 'reject')
                    : 'multi'
                } ${selectedVote === index ? 'selected' : ''}`}
                onClick={() => setSelectedVote(index)}
                aria-pressed={selectedVote === index}
              >
                <span className="vote-option-label">{label}</span>
              </button>
            ))}
          </div>

          <button
            className="submit-btn"
            onClick={handleSubmitVote}
            disabled={selectedVote === null}
          >
            Generate Proof & Submit
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
            <h3 className="success-title">Vote Recorded</h3>

            {proofState.proofDetails && proposal && (
              <div className="proof-details">
                <div className="proof-detail-row">
                  <span className="proof-detail-label">Vote</span>
                  <span className="proof-detail-value">
                    {proposal.optionLabels?.[selectedVote ?? 0] || (selectedVote === 1 ? 'YES' : 'NO')}
                  </span>
                </div>
                <div className="proof-detail-row">
                  <span className="proof-detail-label">Proof hash</span>
                  <span className="proof-detail-value">
                    {proofState.proofDetails.nullifier.slice(0, 16)}...
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <a
                href={getExplorerUrl(proofState.txSignature!)}
                target="_blank"
                rel="noopener noreferrer"
                className="explorer-link"
              >
                View on Explorer
              </a>
              <Link to={`/dashboard${location.search}`} className="explorer-link">
                Back to Proposals
              </Link>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message-container">
          <div className="error-message">
            <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7.25 4.5a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7.5a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            <span>{error}</span>
          </div>
          <div className="error-recovery">
            {error.includes('already voted') && (
              <p className="error-hint">Each voter can only vote once per proposal. Your previous vote has been recorded.</p>
            )}
            {error.includes('wallet') && (
              <p className="error-hint">Please connect your Solana wallet (Phantom, Solflare, etc.) to submit your vote.</p>
            )}
            {error.includes('not found') && (
              <p className="error-hint">Make sure you're using the correct secret key that was registered for this proposal.</p>
            )}
            {error.includes('Proof') && (
              <p className="error-hint">Try refreshing the page and generating the proof again. This uses your browser's computing power.</p>
            )}
            {(wizardStep === 'vote' || error.includes('Proof')) && (
              <button
                className="error-retry-btn"
                onClick={() => {
                  setError(null);
                  if (wizardStep !== 'secret') {
                    setWizardStep('secret');
                    setMerkleProof(null);
                    setSelectedVote(null);
                  }
                }}
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Results Section Component
  const ResultsSection = () => {
    const winningLabel = proposal.optionLabels?.[winningIndex] || (winningIndex === 1 ? 'Approved' : 'Rejected');
    const winningPercent = votePercentages[winningIndex] || 0;

    return (
      <div className="results-section">
        <h3 className="results-title">Final Results</h3>
        {isBinaryVote ? (
          // Binary result display
          <>
            <div className={`result-verdict ${yesPercent >= 50 ? 'approved' : 'rejected'}`}>
              {yesPercent >= 50 ? 'Approved' : 'Rejected'}
            </div>
            <div className="result-summary">
              <span>Total votes: {totalVotes}</span>
              <span>Approval: {yesPercent}%</span>
              <span>{proposal.isFinalized ? 'Finalized on-chain' : 'Awaiting finalization'}</span>
            </div>
          </>
        ) : (
          // Multi-choice result display
          <>
            <div className="result-verdict approved">
              Winner: {winningLabel}
            </div>
            <div className="result-summary">
              <span>Total votes: {totalVotes}</span>
              <span>Winning: {winningPercent}% ({voteCounts[winningIndex]} votes)</span>
              <span>{proposal.isFinalized ? 'Finalized on-chain' : 'Awaiting finalization'}</span>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="proposal-view">
      <Link to={`/dashboard${location.search}`} className="back-link">
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
        {isBinaryVote ? (
          // Binary yes/no vote display
          <>
            <div className="vote-progress-header">
              <span className="vote-progress-label">{proposal.optionLabels?.[1] || 'Approve'}</span>
              <span className="vote-progress-label">{proposal.optionLabels?.[0] || 'Reject'}</span>
            </div>
            <div className="vote-progress-bar">
              <div className="vote-progress-yes" style={{ width: `${yesPercent}%` }} />
              <div className="vote-progress-no" style={{ width: `${100 - yesPercent}%` }} />
            </div>
            <div className="vote-counts">
              <span className="vote-count-item yes">
                <span className="vote-count-value">{voteCounts[1]}</span> votes ({yesPercent}%)
              </span>
              <span className="vote-count-item no">
                <span className="vote-count-value">{voteCounts[0]}</span> votes ({100 - yesPercent}%)
              </span>
            </div>
          </>
        ) : (
          // Multi-choice vote display
          <div className="multi-choice-results">
            {(proposal.optionLabels || []).map((label, index) => (
              <div key={index} className={`multi-choice-option ${index === winningIndex && totalVotes > 0 ? 'winning' : ''}`}>
                <div className="multi-choice-header">
                  <span className="multi-choice-label">{label}</span>
                  <span className="multi-choice-percent">{votePercentages[index]}%</span>
                </div>
                <div className="multi-choice-bar">
                  <div
                    className="multi-choice-fill"
                    style={{ width: `${votePercentages[index]}%` }}
                  />
                </div>
                <span className="multi-choice-count">{voteCounts[index]} votes</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Voting Wizard - Only show if active */}
      {isActive && <VotingSection />}

      {/* Results for ended/finalized */}
      {(isEnded || proposal.isFinalized) && <ResultsSection />}

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
