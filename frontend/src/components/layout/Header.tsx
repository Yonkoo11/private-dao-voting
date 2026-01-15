import { Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

function DiamondLogo() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="diamond-logo"
    >
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#C9A227" />
        </linearGradient>
        <linearGradient id="goldGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#F7E7CE" />
        </linearGradient>
        <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Main diamond prism shape */}
      <g filter="url(#goldGlow)">
        {/* Top facet */}
        <polygon
          points="18,2 28,12 18,14 8,12"
          fill="url(#goldGradientLight)"
          opacity="0.95"
        />
        {/* Left facet */}
        <polygon
          points="8,12 18,14 18,34 4,16"
          fill="url(#goldGradient)"
          opacity="0.85"
        />
        {/* Right facet */}
        <polygon
          points="28,12 32,16 18,34 18,14"
          fill="url(#goldGradient)"
          opacity="0.7"
        />
        {/* Center highlight line */}
        <line
          x1="18" y1="14"
          x2="18" y2="34"
          stroke="#FFD700"
          strokeWidth="0.5"
          opacity="0.6"
        />
      </g>
    </svg>
  );
}

export function Header() {
  const location = useLocation();
  const isAuthority = new URLSearchParams(location.search).get('role') === 'authority';
  const queryString = location.search;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header>
      <div className="header-left">
        <Link to={`/${queryString}`} className="logo">
          <DiamondLogo />
          <div className="logo-text-container">
            <span className="logo-text">Private DAO</span>
            <span className="logo-accent">VOTING</span>
          </div>
        </Link>

        <nav className="header-nav">
          <Link
            to={`/${queryString}`}
            className={isActive('/') && location.pathname === '/' ? 'active' : ''}
          >
            Proposals
          </Link>
          <Link
            to={`/register${queryString}`}
            className={isActive('/register') ? 'active' : ''}
          >
            Register
          </Link>
          <Link
            to={`/about${queryString}`}
            className={isActive('/about') ? 'active' : ''}
          >
            About
          </Link>
        </nav>
      </div>

      <div className="header-right">
        <span className="network-badge">
          <span className="network-dot" />
          Devnet
        </span>
        {isAuthority && (
          <span className="authority-badge">Authority</span>
        )}
        <WalletMultiButton />
      </div>
    </header>
  );
}
