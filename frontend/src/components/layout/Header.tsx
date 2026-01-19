import { Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

function ShieldLogo() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function Header() {
  const location = useLocation();
  const isAuthority = new URLSearchParams(location.search).get('role') === 'authority';
  const queryString = location.search;

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <header className="header">
      <Link to={`/dashboard${queryString}`} className="header-logo">
        <ShieldLogo />
        <span className="header-logo-text">Private DAO</span>
      </Link>

      <nav className="header-nav">
        <Link
          to={`/dashboard${queryString}`}
          className={isActive('/dashboard') ? 'active' : ''}
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

      <div className="header-actions">
        {isAuthority && (
          <span className="authority-badge">Authority</span>
        )}
        <WalletMultiButton />
      </div>
    </header>
  );
}
