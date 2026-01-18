import { PROGRAM_ID, getExplorerUrl, RPC_PROVIDER } from '../../lib/constants';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <span className="footer-copy">
          Built for Solana Privacy Hackathon 2026
        </span>
        <div className="footer-links">
          <span className="rpc-badge" title="RPC Provider">
            ⚡ Powered by {RPC_PROVIDER}
          </span>
          <a
            href={getExplorerUrl('address', PROGRAM_ID)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Program
          </a>
          <a
            href="https://github.com/Yonkoo11/private-dao-voting"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}
