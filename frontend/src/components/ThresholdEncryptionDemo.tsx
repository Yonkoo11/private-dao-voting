/**
 * Threshold Encryption Demo Component
 *
 * Demonstrates the M-of-N threshold encryption for vote privacy.
 * Shows how votes are encrypted during submission and only decrypted
 * when committee members provide their key shares.
 */

import { useState } from 'react';
import {
  ThresholdEncryption,
  type KeyShare,
  type EncryptedVote,
} from '../services/thresholdEncryption';

interface DemoState {
  step: 'setup' | 'voting' | 'collection' | 'decryption' | 'results';
  committee: {
    threshold: number;
    totalMembers: number;
    shares: KeyShare[];
    secret: bigint;
  } | null;
  encryptedVotes: EncryptedVote[];
  collectedShares: KeyShare[];
  voteCounts: number[] | null;
  optionLabels: string[];
}

export function ThresholdEncryptionDemo() {
  const [state, setState] = useState<DemoState>({
    step: 'setup',
    committee: null,
    encryptedVotes: [],
    collectedShares: [],
    voteCounts: null,
    optionLabels: ['Option A', 'Option B', 'Option C', 'Option D'],
  });

  const [selectedVote, setSelectedVote] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [threshold, setThreshold] = useState(2);
  const [totalMembers, setTotalMembers] = useState(3);

  // Step 1: Setup committee
  const setupCommittee = () => {
    const { secret, shares, config } = ThresholdEncryption.setupDemoCommittee(
      threshold,
      totalMembers
    );

    setState({
      ...state,
      step: 'voting',
      committee: {
        threshold: config.threshold,
        totalMembers: config.totalMembers,
        shares,
        secret,
      },
    });
  };

  // Step 2: Cast encrypted vote
  const castVote = async () => {
    if (selectedVote === null || !state.committee) return;

    setIsProcessing(true);
    try {
      const encryptedVote = await ThresholdEncryption.encryptVote(
        selectedVote,
        1, // proposalId
        state.committee.secret
      );

      setState({
        ...state,
        encryptedVotes: [...state.encryptedVotes, encryptedVote],
      });
      setSelectedVote(null);
    } catch (err) {
      console.error('Encryption failed:', err);
    }
    setIsProcessing(false);
  };

  // Move to share collection phase
  const endVoting = () => {
    setState({ ...state, step: 'collection' });
  };

  // Collect a key share
  const collectShare = (shareIndex: number) => {
    if (!state.committee) return;

    const share = state.committee.shares.find((s) => s.index === shareIndex);
    if (share && !state.collectedShares.find((s) => s.index === shareIndex)) {
      const newCollected = [...state.collectedShares, share];
      setState({
        ...state,
        collectedShares: newCollected,
        step: newCollected.length >= state.committee.threshold ? 'decryption' : 'collection',
      });
    }
  };

  // Decrypt and tally votes
  const decryptVotes = async () => {
    if (state.collectedShares.length < (state.committee?.threshold || 2)) return;

    setIsProcessing(true);
    try {
      const voteCounts = await ThresholdEncryption.tallyVotes(
        state.encryptedVotes,
        state.collectedShares,
        state.optionLabels.length
      );

      setState({
        ...state,
        step: 'results',
        voteCounts,
      });
    } catch (err) {
      console.error('Decryption failed:', err);
    }
    setIsProcessing(false);
  };

  // Reset demo
  const reset = () => {
    setState({
      step: 'setup',
      committee: null,
      encryptedVotes: [],
      collectedShares: [],
      voteCounts: null,
      optionLabels: ['Option A', 'Option B', 'Option C', 'Option D'],
    });
    setSelectedVote(null);
  };

  return (
    <div className="threshold-demo">
      <div className="threshold-demo-header">
        <h2>Threshold Encryption Demo</h2>
        <p className="threshold-demo-subtitle">
          M-of-N committee-based vote privacy
        </p>
      </div>

      {/* Progress indicator */}
      <div className="threshold-progress">
        {['setup', 'voting', 'collection', 'decryption', 'results'].map((s, i) => (
          <div
            key={s}
            className={`threshold-progress-step ${
              state.step === s ? 'active' : ''
            } ${
              ['setup', 'voting', 'collection', 'decryption', 'results'].indexOf(state.step) > i
                ? 'completed'
                : ''
            }`}
          >
            <div className="threshold-progress-dot">{i + 1}</div>
            <span className="threshold-progress-label">
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Committee Setup */}
      {state.step === 'setup' && (
        <div className="threshold-step">
          <h3>1. Committee Setup</h3>
          <p>Configure the decryption committee. M-of-N members must cooperate to reveal results.</p>

          <div className="threshold-config">
            <div className="config-field">
              <label>Threshold (M)</label>
              <input
                type="number"
                min={2}
                max={totalMembers}
                value={threshold}
                onChange={(e) => setThreshold(Math.max(2, Math.min(totalMembers, parseInt(e.target.value) || 2)))}
              />
              <span className="config-hint">Minimum shares needed</span>
            </div>

            <div className="config-field">
              <label>Total Members (N)</label>
              <input
                type="number"
                min={threshold}
                max={10}
                value={totalMembers}
                onChange={(e) => setTotalMembers(Math.max(threshold, Math.min(10, parseInt(e.target.value) || 3)))}
              />
              <span className="config-hint">Total committee size</span>
            </div>
          </div>

          <div className="threshold-info">
            <strong>{threshold}-of-{totalMembers}</strong> committee members must provide their key shares to decrypt vote results.
          </div>

          <button className="threshold-btn primary" onClick={setupCommittee}>
            Generate Committee Keys
          </button>
        </div>
      )}

      {/* Step 2: Voting */}
      {state.step === 'voting' && state.committee && (
        <div className="threshold-step">
          <h3>2. Cast Encrypted Votes</h3>
          <p>Votes are encrypted with the committee's public key. No one can see individual votes.</p>

          <div className="threshold-vote-options">
            {state.optionLabels.map((label, index) => (
              <button
                key={index}
                className={`threshold-vote-option ${selectedVote === index ? 'selected' : ''}`}
                onClick={() => setSelectedVote(index)}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            className="threshold-btn primary"
            onClick={castVote}
            disabled={selectedVote === null || isProcessing}
          >
            {isProcessing ? 'Encrypting...' : 'Cast Encrypted Vote'}
          </button>

          <div className="threshold-vote-count">
            <strong>{state.encryptedVotes.length}</strong> encrypted votes cast
          </div>

          {state.encryptedVotes.length > 0 && (
            <div className="encrypted-votes-preview">
              <h4>Encrypted Vote Data (Hidden)</h4>
              {state.encryptedVotes.slice(-3).map((ev, i) => (
                <div key={i} className="encrypted-vote-item">
                  <code>
                    {Array.from(ev.ciphertext)
                      .map((b) => b.toString(16).padStart(2, '0'))
                      .join('')
                      .slice(0, 32)}...
                  </code>
                </div>
              ))}
            </div>
          )}

          {state.encryptedVotes.length >= 2 && (
            <button className="threshold-btn secondary" onClick={endVoting}>
              End Voting Period
            </button>
          )}
        </div>
      )}

      {/* Step 3: Share Collection */}
      {state.step === 'collection' && state.committee && (
        <div className="threshold-step">
          <h3>3. Collect Key Shares</h3>
          <p>
            Committee members must provide their key shares. Need{' '}
            <strong>{state.committee.threshold}</strong> of{' '}
            <strong>{state.committee.totalMembers}</strong> shares.
          </p>

          <div className="threshold-shares">
            {state.committee.shares.map((share) => {
              const isCollected = state.collectedShares.some(
                (s) => s.index === share.index
              );
              return (
                <div
                  key={share.index}
                  className={`threshold-share ${isCollected ? 'collected' : ''}`}
                >
                  <div className="share-header">
                    <span className="share-name">Member {share.index}</span>
                    {isCollected && <span className="share-status">Submitted</span>}
                  </div>
                  {!isCollected && (
                    <button
                      className="threshold-btn small"
                      onClick={() => collectShare(share.index)}
                    >
                      Submit Share
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="threshold-collection-progress">
            <strong>{state.collectedShares.length}</strong> of{' '}
            <strong>{state.committee.threshold}</strong> shares collected
          </div>
        </div>
      )}

      {/* Step 4: Decryption */}
      {state.step === 'decryption' && (
        <div className="threshold-step">
          <h3>4. Decrypt Results</h3>
          <p>
            Threshold reached! {state.collectedShares.length} shares collected.
            Ready to decrypt and tally votes.
          </p>

          <button
            className="threshold-btn primary"
            onClick={decryptVotes}
            disabled={isProcessing}
          >
            {isProcessing ? 'Decrypting...' : 'Decrypt & Tally Votes'}
          </button>
        </div>
      )}

      {/* Step 5: Results */}
      {state.step === 'results' && state.voteCounts && (
        <div className="threshold-step">
          <h3>5. Decrypted Results</h3>
          <p>Vote results have been revealed after committee authorization.</p>

          <div className="threshold-results">
            {state.optionLabels.map((label, index) => {
              const count = state.voteCounts![index];
              const total = state.voteCounts!.reduce((a, b) => a + b, 0);
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;
              const isWinner = count === Math.max(...state.voteCounts!);

              return (
                <div
                  key={index}
                  className={`threshold-result-item ${isWinner ? 'winner' : ''}`}
                >
                  <div className="result-header">
                    <span className="result-label">{label}</span>
                    <span className="result-percent">{percent}%</span>
                  </div>
                  <div className="result-bar">
                    <div
                      className="result-bar-fill"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="result-count">{count} votes</span>
                </div>
              );
            })}
          </div>

          <div className="threshold-summary">
            <p>
              Total votes: <strong>{state.voteCounts.reduce((a, b) => a + b, 0)}</strong>
            </p>
            <p>
              Committee: <strong>{state.collectedShares.length}</strong> of{' '}
              <strong>{state.committee?.totalMembers}</strong> members participated
            </p>
          </div>

          <button className="threshold-btn secondary" onClick={reset}>
            Reset Demo
          </button>
        </div>
      )}
    </div>
  );
}
