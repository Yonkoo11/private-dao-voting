import { TerminalCard } from '../components/shared';

export function About() {
  return (
    <div className="about-page">
      <TerminalCard title="Protocol Overview">
        <div className="protocol-diagram">
          <div className="diagram-flow">
            <div className="diagram-step">
              <div className="step-box">
                <span className="step-num">01</span>
                <span className="step-name">Voter</span>
              </div>
              <span className="step-desc">Inputs secret + vote</span>
            </div>
            <div className="diagram-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14m-7-7 7 7-7 7" />
              </svg>
            </div>
            <div className="diagram-step">
              <div className="step-box">
                <span className="step-num">02</span>
                <span className="step-name">Noir</span>
              </div>
              <span className="step-desc">Generates ZK proof</span>
            </div>
            <div className="diagram-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14m-7-7 7 7-7 7" />
              </svg>
            </div>
            <div className="diagram-step">
              <div className="step-box">
                <span className="step-num">03</span>
                <span className="step-name">Groth16</span>
              </div>
              <span className="step-desc">Compresses proof</span>
            </div>
            <div className="diagram-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14m-7-7 7 7-7 7" />
              </svg>
            </div>
            <div className="diagram-step">
              <div className="step-box">
                <span className="step-num">04</span>
                <span className="step-name">Solana</span>
              </div>
              <span className="step-desc">Verifies & records</span>
            </div>
          </div>
        </div>
      </TerminalCard>

      <TerminalCard title="Privacy Guarantees">
        <div className="guarantees-grid">
          <div className="guarantee-card">
            <h4 className="guarantee-title">Vote Secrecy</h4>
            <p className="guarantee-desc">
              Your vote choice is hidden inside the ZK proof. No one can determine
              how you voted—not even the DAO authority.
            </p>
          </div>
          <div className="guarantee-card">
            <h4 className="guarantee-title">Voter Anonymity</h4>
            <p className="guarantee-desc">
              Merkle proofs prove you're in the voter list without revealing your
              position or identity in the tree.
            </p>
          </div>
          <div className="guarantee-card">
            <h4 className="guarantee-title">Double-Vote Prevention</h4>
            <p className="guarantee-desc">
              Nullifiers ensure each voter can only vote once per proposal, without
              linking nullifiers to voter identities.
            </p>
          </div>
          <div className="guarantee-card">
            <h4 className="guarantee-title">Verifiable Tallying</h4>
            <p className="guarantee-desc">
              All votes are recorded on-chain. Anyone can verify the tally is correct
              without learning individual votes.
            </p>
          </div>
        </div>
      </TerminalCard>

      <TerminalCard title="How It Works">
        <div className="how-it-works">
          <div className="step-detail">
            <h4>1. Voter Registration</h4>
            <p>
              Each voter receives a secret. The DAO authority computes a Merkle tree
              of all voter commitments (hash of secret). Only the Merkle root is stored
              on-chain—individual voters remain private.
            </p>
          </div>

          <div className="step-detail">
            <h4>2. Voting</h4>
            <p>
              When voting, the voter's browser generates a ZK proof that:
            </p>
            <ul>
              <li>They know a secret whose hash is in the voter Merkle tree</li>
              <li>Their nullifier hasn't been used (no double voting)</li>
              <li>Their vote is valid (0 or 1)</li>
            </ul>
          </div>

          <div className="step-detail">
            <h4>3. Verification</h4>
            <p>
              The Solana program verifies the Groth16 proof, checks the nullifier
              hasn't been used, and records the vote. The vote tally updates, but
              no one can determine which voter cast which vote.
            </p>
          </div>

          <div className="step-detail">
            <h4>4. Finalization</h4>
            <p>
              After voting ends, the authority finalizes the proposal. The result
              is immutably recorded on Solana, verifiable by anyone.
            </p>
          </div>
        </div>
      </TerminalCard>

      <TerminalCard title="Tech Stack">
        <div className="tech-stack">
          <div className="tech-item">
            <span className="tech-badge">Noir</span>
            <span className="tech-desc">ZK circuit language by Aztec</span>
          </div>
          <div className="tech-item">
            <span className="tech-badge">Groth16</span>
            <span className="tech-desc">Succinct proof system (464 bytes)</span>
          </div>
          <div className="tech-item">
            <span className="tech-badge">Sunspot</span>
            <span className="tech-desc">Noir to Solana proof compiler</span>
          </div>
          <div className="tech-item">
            <span className="tech-badge">Anchor</span>
            <span className="tech-desc">Solana program framework</span>
          </div>
          <div className="tech-item">
            <span className="tech-badge">React</span>
            <span className="tech-desc">Frontend framework</span>
          </div>
          <div className="tech-item">
            <span className="tech-badge">Vite</span>
            <span className="tech-desc">Build tooling</span>
          </div>
        </div>
      </TerminalCard>

      <TerminalCard title="Source Code">
        <div className="source-links">
          <a
            href="https://github.com/private-collective-action"
            target="_blank"
            rel="noopener noreferrer"
            className="source-link"
          >
            View on GitHub
          </a>
          <div className="source-structure">
            <pre>{`
├── circuits/          # Noir ZK circuit
│   └── src/main.nr   # Voting proof logic
├── programs/          # Solana program
│   └── lib.rs        # On-chain verification
├── client/            # CLI tools
│   └── cast-vote.ts  # Proof generation
└── frontend/          # This UI
    └── src/          # React components
            `}</pre>
          </div>
        </div>
      </TerminalCard>
    </div>
  );
}
