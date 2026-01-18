import { useState } from 'react';
import { TerminalCard } from '../components/shared';
import { DEMO_VOTER_SECRET } from '../lib/constants';

export function Register() {
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkSecret, setCheckSecret] = useState('');
  const [checkResult, setCheckResult] = useState<'eligible' | 'not_eligible' | null>(null);

  const generateSecret = () => {
    // Generate a cryptographically secure random secret
    const array = new Uint32Array(3);
    crypto.getRandomValues(array);
    const secret = Array.from(array).map(n => n.toString(36)).join('').slice(0, 16);
    setGeneratedSecret(secret);
    setCopied(false);
  };

  const copyToClipboard = async () => {
    if (generatedSecret) {
      await navigator.clipboard.writeText(generatedSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const checkEligibility = () => {
    // In demo, only the demo secret is eligible
    if (checkSecret === DEMO_VOTER_SECRET) {
      setCheckResult('eligible');
    } else {
      setCheckResult('not_eligible');
    }
  };

  return (
    <div className="register-page">
      <TerminalCard title="Voter Registration">
        <div className="intro-text">
          <p>
            Your <strong>voter secret</strong> is your identity in the zero-knowledge voting system.
            It proves you're eligible to vote without revealing who you are.
          </p>
          <div className="warning-box">
            <span className="warning-icon">!</span>
            <span>Never share your secret. If lost, you cannot recover it or vote.</span>
          </div>
        </div>
      </TerminalCard>

      <TerminalCard title="Generate Secret">
        {!generatedSecret ? (
          <div className="generate-section">
            <p className="section-desc">
              Generate a new voter secret. Make sure to save it securely.
            </p>
            <button className="submit-btn" onClick={generateSecret}>
              Generate New Secret
            </button>
          </div>
        ) : (
          <div className="secret-display">
            <div className="secret-box">
              <span className="secret-label">Your Secret</span>
              <span className="secret-value">{generatedSecret}</span>
            </div>
            <div className="secret-actions">
              <button className="action-btn" onClick={copyToClipboard}>
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button className="action-btn secondary" onClick={generateSecret}>
                Regenerate
              </button>
            </div>
            <div className="warning-box">
              <span className="warning-icon">!</span>
              <span>
                Save this secret NOW. It will not be shown again.
                Write it down or store in a password manager.
              </span>
            </div>
          </div>
        )}
      </TerminalCard>

      <TerminalCard title="Check Eligibility">
        <p className="section-desc">
          Check if your secret is registered for voting on a proposal.
        </p>

        <div className="check-section">
          <div className="input-group">
            <label className="input-label">Your Secret</label>
            <input
              type="password"
              className="input-field"
              placeholder="Enter your secret to check..."
              value={checkSecret}
              onChange={(e) => {
                setCheckSecret(e.target.value);
                setCheckResult(null);
              }}
            />
          </div>

          <button
            className="submit-btn"
            onClick={checkEligibility}
            disabled={!checkSecret}
          >
            Check Eligibility
          </button>

          {checkResult === 'eligible' && (
            <div className="result-box success">
              <span className="result-icon">&#x2713;</span>
              <span>You are eligible to vote on active proposals.</span>
            </div>
          )}

          {checkResult === 'not_eligible' && (
            <div className="result-box error">
              <span className="result-icon">&#x2717;</span>
              <span>This secret is not registered for any proposals.</span>
            </div>
          )}
        </div>
      </TerminalCard>

      {import.meta.env.DEV && (
        <TerminalCard title="Demo Mode">
          <div className="demo-info">
            <div className="warning-box">
              <span className="warning-icon">!</span>
              <span>Development mode only - hidden in production</span>
            </div>
            <p>For testing, use the pre-registered voter secret: <code>12345</code></p>
          </div>
        </TerminalCard>
      )}
    </div>
  );
}
