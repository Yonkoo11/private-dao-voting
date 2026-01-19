import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DEMO_VOTER_SECRET } from '../lib/constants';

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
  const [duration, setDuration] = useState<number>(3600);
  const [voterSecrets, setVoterSecrets] = useState<string[]>([DEMO_VOTER_SECRET]);
  const [newSecret, setNewSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durationOptions = [
    { value: 3600, label: '1 Hour' },
    { value: 21600, label: '6 Hours' },
    { value: 86400, label: '24 Hours' },
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

    await new Promise(r => setTimeout(r, 2000));

    const newId = 5;
    navigate(`/proposal/${newId}${location.search}`);
  };

  return (
    <div className="about-page">
      <h1>Create Proposal</h1>

      <div className="warning-box" style={{ marginBottom: 'var(--space-6)' }}>
        <span className="warning-icon">!</span>
        <span>Demo Mode - Proposal creation simulated (not submitted to chain)</span>
      </div>

      <h2>Proposal Details</h2>

      <div className="guarantee-card">
        <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
          <label className="input-label">Title</label>
          <input
            type="text"
            className="input-field"
            placeholder="Enter proposal title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
          <label className="input-label">Description</label>
          <textarea
            className="input-field"
            placeholder="Describe the proposal..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            disabled={isSubmitting}
            style={{ resize: 'vertical', minHeight: '100px' }}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Voting Duration</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {durationOptions.map(opt => (
              <button
                key={opt.value}
                className={`action-btn ${duration === opt.value ? '' : 'secondary'}`}
                onClick={() => setDuration(opt.value)}
                disabled={isSubmitting}
                style={{ flex: 1 }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <h2>Voter Whitelist</h2>

      <div className="guarantee-card">
        <p className="guarantee-desc" style={{ marginBottom: 'var(--space-4)' }}>
          Add voter secrets to allow them to participate. Each voter needs a unique secret.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          {voterSecrets.map((secret, i) => (
            <div
              key={secret}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{secret}</span>
              <button
                onClick={() => removeVoterSecret(secret)}
                disabled={isSubmitting}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-lg)',
                  padding: '0 var(--space-1)',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Enter voter secret..."
            value={newSecret}
            onChange={(e) => setNewSecret(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addVoterSecret()}
            disabled={isSubmitting}
            style={{ flex: 1 }}
          />
          <button
            className="action-btn"
            onClick={addVoterSecret}
            disabled={isSubmitting || !newSecret}
          >
            Add
          </button>
        </div>

        {computedRoot && (
          <div style={{ marginTop: 'var(--space-4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Merkle Root: </span>
            <span style={{ color: 'var(--text-secondary)' }}>{computedRoot.slice(0, 20)}...</span>
          </div>
        )}
      </div>

      <h2>Preview</h2>

      <div className="guarantee-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Title</span>
            <span style={{ color: 'var(--text-secondary)' }}>{title || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Duration</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {durationOptions.find(d => d.value === duration)?.label}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Eligible Voters</span>
            <span style={{ color: 'var(--text-secondary)' }}>{voterSecrets.length}</span>
          </div>
        </div>

        {error && (
          <div className="result-box error" style={{ marginBottom: 'var(--space-4)' }}>
            <span className="result-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={isSubmitting || !title || !description || voterSecrets.length === 0}
        >
          {isSubmitting ? 'Creating on Solana...' : 'Create Proposal'}
        </button>
      </div>
    </div>
  );
}
