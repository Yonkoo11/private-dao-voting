import { PROGRAM_ID, getExplorerUrl } from '../../lib/constants';

export function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <span className="footer-text">
          Built for Solana Privacy Hackathon 2026
        </span>
        <div className="footer-links">
          <a
            href={getExplorerUrl('address', PROGRAM_ID)}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            View Program
          </a>
          <span className="footer-divider" />
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}
