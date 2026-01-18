import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TerminalCard } from '../components/shared';
import { DEMO_VOTER_SECRET } from '../lib/constants';

// Simple hash function for demo merkle root visualization
function hashSecrets(secrets: string[]): string {
  let hash = 0;
  const str = secrets.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

export function CreateProposal() {
  const navigate = useNavigate();
  const location = useLocation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number>(3600); // 1 hour default
  const [voterSecrets, setVoterSecrets] = useState<string[]>([DEMO_VOTER_SECRET]);
  const [newSecret, setNewSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durationOptions = [
    { value: 3600, label: '1 HOUR' },
    { value: 21600, label: '6 HOURS' },
    { value: 86400, label: '24 HOURS' },
  ];

  const addVoterSecret = () => {
    if (newSecret && !voterSecrets.includes(newSecret)) {
      setVoterSecrets([...voterSecrets, newSecret]);
      setNewSecret('');
    }
  };

  const removeVoterSecret = (secret: string) => {
    setVoterSecrets(voterSecrets.filter(s => s !== secret));
  };

  // Compute mock merkle root (deterministic based on secrets)
  const computedRoot = useMemo(() => {
    if (voterSecrets.length === 0) return null;
    return `0x${hashSecrets(voterSecrets)}`;
  }, [voterSecrets]);

  const handleSubmit = async () => {
    if (!title || !description || voterSecrets.length === 0) {
      setError('Please fill in all fields and add at least one voter');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    // DEMO MODE: Simulates transaction - not yet connected to Solana program
    // TODO: Replace with actual createProposal transaction when program is deployed
    await new Promise(r => setTimeout(r, 2000));

    // Redirect to the new proposal (demo ID)
    const newId = 5;
    navigate(`/proposal/${newId}${location.search}`);
  };

  return (
    <div className="create-proposal">
      <div className="demo-banner" role="alert">
        Demo Mode - Proposal creation simulated (not submitted to chain)
      </div>
      <TerminalCard title="CREATE::NEW_PROPOSAL">
        <div className="form-section">
          <div className="input-group">
            <label className="input-label">
              <span className="label-icon">&gt;</span>
              TITLE
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter proposal title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="input-group">
            <label className="input-label">
              <span className="label-icon">&gt;</span>
              DESCRIPTION
            </label>
            <textarea
              className="input-field textarea"
              placeholder="Describe the proposal..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          <div className="input-group">
            <label className="input-label">
              <span className="label-icon">&gt;</span>
              VOTING_DURATION
            </label>
            <div className="duration-options">
              {durationOptions.map(opt => (
                <button
                  key={opt.value}
                  className={`duration-btn ${duration === opt.value ? 'selected' : ''}`}
                  onClick={() => setDuration(opt.value)}
                  disabled={isSubmitting}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </TerminalCard>

      <TerminalCard title="VOTER::WHITELIST">
        <p className="section-hint">
          Add voter secrets to allow them to participate. Each voter needs a unique secret.
        </p>

        <div className="voter-list">
          {voterSecrets.map((secret, i) => (
            <div key={secret} className="voter-item">
              <span className="voter-index">{String(i + 1).padStart(2, '0')}</span>
              <span className="voter-secret">{secret}</span>
              <button
                className="voter-remove"
                onClick={() => removeVoterSecret(secret)}
                disabled={isSubmitting}
                aria-label={`Remove voter ${i + 1}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="add-voter">
          <input
            type="text"
            className="input-field"
            placeholder="Enter voter secret..."
            value={newSecret}
            onChange={(e) => setNewSecret(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addVoterSecret()}
            disabled={isSubmitting}
          />
          <button
            className="add-btn"
            onClick={addVoterSecret}
            disabled={isSubmitting || !newSecret}
          >
            + ADD
          </button>
        </div>

        {computedRoot && (
          <div className="merkle-root">
            <span className="root-label">COMPUTED MERKLE ROOT:</span>
            <span className="root-value">{computedRoot.slice(0, 20)}...</span>
          </div>
        )}
      </TerminalCard>

      <TerminalCard title="SUBMIT::PREVIEW">
        <div className="preview">
          <div className="preview-row">
            <span className="preview-label">Title</span>
            <span className="preview-value">{title || '—'}</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Duration</span>
            <span className="preview-value">
              {durationOptions.find(d => d.value === duration)?.label}
            </span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Eligible Voters</span>
            <span className="preview-value">{voterSecrets.length}</span>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">!</span>
            {error}
          </div>
        )}

        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={isSubmitting || !title || !description || voterSecrets.length === 0}
        >
          {isSubmitting ? (
            <>
              <span className="loading-spinner" />
              CREATING ON SOLANA...
            </>
          ) : (
            'CREATE PROPOSAL ON SOLANA'
          )}
        </button>
      </TerminalCard>
    </div>
  );
}
