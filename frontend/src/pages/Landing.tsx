import { Link } from 'react-router-dom';

// Mini proposal data for preview
const PREVIEW_PROPOSALS = [
  { title: 'Treasury Q1 2026', percent: 67, active: true },
  { title: 'Grant Program', percent: 80, active: true },
  { title: 'Protocol Upgrade', percent: 33, active: false },
];

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
      <path d="M9 12l2 2 4-4" strokeWidth="2" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14m-7-7 7 7-7 7" />
    </svg>
  );
}

export function Landing() {
  return (
    <div className="landing">
      {/* Left side - Brand message */}
      <div className="landing-brand">
        <div className="landing-logo">
          <ShieldIcon />
        </div>

        <div className="landing-tagline">Zero-Knowledge Governance</div>

        <h1 className="landing-title">
          <span className="landing-title-gradient">PRIVATE DAO</span>
          <br />
          VOTING
        </h1>

        <p className="landing-subtitle">
          Your vote is verified. Your identity isn't.
          <br />
          Anonymous on-chain voting powered by ZK proofs.
        </p>

        <div className="landing-cta">
          <Link to="/dashboard" className="landing-cta-primary">
            Enter Governance
            <ArrowRightIcon />
          </Link>
          <Link to="/about" className="landing-cta-secondary">
            How it works
          </Link>
        </div>

        <div className="landing-stats">
          <span>47 proposals</span>
          <span className="landing-stats-divider">·</span>
          <span>1,247 votes cast</span>
          <span className="landing-stats-divider">·</span>
          <span>100% verified</span>
        </div>
      </div>

      {/* Right side - Live governance preview */}
      <div className="landing-preview">
        <div className="landing-preview-card">
          <div className="landing-preview-header">
            <span className="landing-preview-title">Live Governance Feed</span>
            <span className="landing-preview-live">Live</span>
          </div>

          <div className="landing-mini-proposals">
            {PREVIEW_PROPOSALS.map((proposal, index) => (
              <div
                key={index}
                className={`landing-mini-proposal ${proposal.active ? 'active' : ''}`}
              >
                <span className="landing-mini-proposal-title">{proposal.title}</span>
                <div className="landing-mini-progress">
                  <div className="landing-mini-bar">
                    <div
                      className="landing-mini-bar-fill"
                      style={{ width: `${proposal.percent}%` }}
                    />
                  </div>
                  <span className="landing-mini-percent">{proposal.percent}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="landing-preview-footer">
            <span>12 voters</span>
            <span>3 active proposals</span>
          </div>
        </div>
      </div>

      {/* Feature badges - now handled by CSS as strip */}
      <div className="landing-features">
        <div className="landing-feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          ZK Proofs
        </div>
        <div className="landing-feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          On-Chain
        </div>
        <div className="landing-feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
            <path d="M2 2l20 20" strokeWidth="2" />
          </svg>
          Anonymous
        </div>
        <div className="landing-feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <path d="M22 4L12 14.01l-3-3" />
          </svg>
          Verified
        </div>
      </div>
    </div>
  );
}
