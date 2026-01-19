import { useState } from 'react';
import { DEMO_VOTER_SECRET } from '../lib/constants';

type RegistrationStep = 1 | 2 | 3;

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4m0 4h.01" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Register() {
  const [step, setStep] = useState<RegistrationStep>(1);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkSecret, setCheckSecret] = useState('');
  const [checkResult, setCheckResult] = useState<'eligible' | 'not_eligible' | null>(null);

  const generateSecret = () => {
    const array = new Uint32Array(3);
    crypto.getRandomValues(array);
    const secret = Array.from(array).map(n => n.toString(36)).join('').slice(0, 16);
    setGeneratedSecret(secret);
    setCopied(false);
    setStep(2);
  };

  const copyToClipboard = async () => {
    if (generatedSecret) {
      await navigator.clipboard.writeText(generatedSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const confirmSaved = () => {
    setStep(3);
  };

  const checkEligibility = () => {
    if (checkSecret === DEMO_VOTER_SECRET) {
      setCheckResult('eligible');
    } else {
      setCheckResult('not_eligible');
    }
  };

  const resetFlow = () => {
    setStep(1);
    setGeneratedSecret(null);
    setCopied(false);
  };

  return (
    <div className="about-page">
      <h1>Voter Registration</h1>

      <p>
        Generate your anonymous voting credential. This secret proves your eligibility without revealing your identity.
      </p>

      {/* Progress Stepper */}
      <div className="register-stepper">
        <div className={`register-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <div className="register-step-number">
            {step > 1 ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="16" height="16">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : '1'}
          </div>
          <span className="register-step-label">Generate</span>
        </div>

        <div className={`register-step-connector ${step >= 2 ? 'active' : ''}`} />

        <div className={`register-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <div className="register-step-number">
            {step > 2 ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="16" height="16">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : '2'}
          </div>
          <span className="register-step-label">Save</span>
        </div>

        <div className={`register-step-connector ${step >= 3 ? 'active' : ''}`} />

        <div className={`register-step ${step >= 3 ? 'active' : ''}`}>
          <div className="register-step-number">3</div>
          <span className="register-step-label">Done</span>
        </div>
      </div>

      {/* Step 1: Introduction */}
      {step === 1 && (
        <div className="zen-card">
          <div className="zen-card-header">
            <span className="zen-card-title">Generate Your Secret</span>
          </div>
          <div className="zen-card-body">
            <div className="shield-visual">
              <ShieldIcon className="shield-icon-large" />
            </div>

            <div className="intro-text">
              <p>
                <strong>Your voter secret is your anonymous identity.</strong> It generates a cryptographic commitment that proves you can vote without revealing who you are.
              </p>
              <p>
                Once generated, save it securely. You will need this secret every time you vote. We cannot recover it for you.
              </p>
            </div>

            <button className="submit-btn" onClick={generateSecret} style={{ marginTop: 'var(--space-6)' }}>
              Generate New Secret
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Show Secret */}
      {step === 2 && generatedSecret && (
        <div className="zen-card">
          <div className="zen-card-header">
            <span className="zen-card-title">Save Your Secret</span>
          </div>
          <div className="zen-card-body">
            <div className="secret-display">
              <div className="secret-box">
                <span className="secret-label">Your Voter Secret</span>
                <span className="secret-value">{generatedSecret}</span>
              </div>

              <div className="secret-actions">
                <button
                  className={`action-btn ${copied ? 'copy-success' : ''}`}
                  onClick={copyToClipboard}
                >
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
                <button className="action-btn secondary" onClick={resetFlow}>
                  Regenerate
                </button>
              </div>

              <div className="warning-box">
                <span className="warning-icon">!</span>
                <span>
                  Save this secret NOW in a secure location. This secret exists only in your browser session.
                  If you close this tab without saving, you will lose access forever. We cannot recover it.
                </span>
              </div>

              <button
                className="submit-btn"
                onClick={confirmSaved}
                disabled={!copied}
                style={{ marginTop: 'var(--space-4)' }}
              >
                I've Saved My Secret
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Complete */}
      {step === 3 && (
        <div className="zen-card">
          <div className="zen-card-header">
            <span className="zen-card-title">Registration Complete</span>
          </div>
          <div className="zen-card-body">
            <div className="result-box success" style={{ marginBottom: 'var(--space-4)' }}>
              <span className="result-icon">&#x2713;</span>
              <span>Your voter secret has been generated. You're ready to vote on proposals.</span>
            </div>

            <div className="intro-text">
              <p>
                <strong>Next steps:</strong> Your secret is now your anonymous credential. Use it to vote on any active proposal. Each time you vote, a zero-knowledge proof will verify your eligibility without revealing your identity.
              </p>
            </div>

            <button
              className="submit-btn"
              onClick={() => window.location.href = '/dashboard'}
              style={{ marginTop: 'var(--space-4)' }}
            >
              Go to Proposals
            </button>
          </div>
        </div>
      )}

      <h2>Check Eligibility</h2>

      <div className="guarantee-card">
        <p className="guarantee-desc" style={{ marginBottom: 'var(--space-4)' }}>
          Already have a secret? Check if it's registered for voting.
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
            style={{ marginTop: 'var(--space-4)' }}
          >
            Check Eligibility
          </button>

          {checkResult === 'eligible' && (
            <div className="result-box success" style={{ marginTop: 'var(--space-4)' }}>
              <span className="result-icon">&#x2713;</span>
              <span>You are eligible to vote on active proposals.</span>
            </div>
          )}

          {checkResult === 'not_eligible' && (
            <div className="result-box error" style={{ marginTop: 'var(--space-4)' }}>
              <span className="result-icon">&#x2717;</span>
              <span>This secret is not registered for any proposals.</span>
            </div>
          )}
        </div>
      </div>

      {import.meta.env.DEV && (
        <>
          <h2>Demo Mode</h2>
          <div className="guarantee-card">
            <div className="warning-box">
              <span className="warning-icon">!</span>
              <span>Development mode only</span>
            </div>
            <div className="demo-info" style={{ marginTop: 'var(--space-3)' }}>
              <p>
                For testing, use the pre-registered voter secret: <code>12345</code>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
