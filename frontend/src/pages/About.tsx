export function About() {
  return (
    <div className="about-page">
      <h1>How It Works</h1>

      {/* Interactive Protocol Flow Diagram */}
      <div className="protocol-flow">
        <div className="protocol-step">
          <div className="protocol-step-number">1</div>
          <span className="protocol-step-name">Register</span>
          <span className="protocol-step-desc">Generate secret, derive commitment</span>
        </div>

        <div className="protocol-step">
          <div className="protocol-step-number">2</div>
          <span className="protocol-step-name">Vote</span>
          <span className="protocol-step-desc">Select choice, create ZK proof</span>
        </div>

        <div className="protocol-step">
          <div className="protocol-step-number">3</div>
          <span className="protocol-step-name">Verify</span>
          <span className="protocol-step-desc">On-chain Groth16 verification</span>
        </div>

        <div className="protocol-step">
          <div className="protocol-step-number">4</div>
          <span className="protocol-step-name">Tally</span>
          <span className="protocol-step-desc">Count votes, publish result</span>
        </div>
      </div>

      <h2>Protocol Flow</h2>

      <div className="how-it-works">
        <div className="step-detail">
          <h4>1. REGISTER</h4>
          <p>
            Generate a secret key. From this secret, a public commitment is derived using a Pedersen hash.
            Only the commitment is stored on-chain in the voters Merkle tree. Your secret stays private.
          </p>
        </div>

        <div className="step-detail">
          <h4>2. VOTE</h4>
          <p>
            Select your choice (YES or NO). The system generates a zero-knowledge proof that proves:
          </p>
          <ul>
            <li>You know a valid secret</li>
            <li>Your commitment exists in the voters tree</li>
            <li>You haven't voted before (nullifier check)</li>
          </ul>
        </div>

        <div className="step-detail">
          <h4>3. VERIFY</h4>
          <p>
            The proof is submitted to Solana where a Groth16 verifier validates the proof on-chain.
            Invalid proofs are rejected. Valid proofs reveal nothing about your identity or your vote.
          </p>
        </div>

        <div className="step-detail">
          <h4>4. TALLY</h4>
          <p>
            Once voting ends, votes are counted. Individual votes remain cryptographically hidden.
            Only the aggregate result (total YES vs NO) becomes public. The DAO then acts on the outcome.
          </p>
        </div>
      </div>

      <h2>Privacy Guarantees</h2>

      <div className="guarantees-grid">
        <div className="guarantee-card">
          <h3 className="guarantee-title">Vote Secrecy</h3>
          <p className="guarantee-desc">
            No one can see how you voted. Your choice is encrypted inside the ZK proof.
            Even the verifier cannot extract your vote from the proof.
          </p>
        </div>

        <div className="guarantee-card">
          <h3 className="guarantee-title">Voter Anonymity</h3>
          <p className="guarantee-desc">
            No link between your wallet and your vote. The proof only shows
            "a valid voter voted" — never "which voter" or "how they voted."
          </p>
        </div>

        <div className="guarantee-card">
          <h3 className="guarantee-title">Double-Vote Prevention</h3>
          <p className="guarantee-desc">
            Each voter secret generates a unique nullifier per proposal.
            Attempting to vote twice reveals the nullifier collision, not your identity.
          </p>
        </div>
      </div>

      <h2>Technology Stack</h2>

      <div className="tech-stack">
        <div className="tech-item">
          <span className="tech-badge">Noir</span>
        </div>
        <div className="tech-item">
          <span className="tech-badge">Groth16</span>
        </div>
        <div className="tech-item">
          <span className="tech-badge">Solana</span>
        </div>
        <div className="tech-item">
          <span className="tech-badge">Anchor</span>
        </div>
        <div className="tech-item">
          <span className="tech-badge">React</span>
        </div>
        <div className="tech-item">
          <span className="tech-badge">TypeScript</span>
        </div>
      </div>

      <h2>Architecture</h2>

      <div className="source-structure">
        <pre>{`private-dao-voting/
├── circuits/              # Noir ZK circuits
│   └── vote/              # Vote verification circuit
│       ├── src/main.nr    # Circuit logic
│       └── Prover.toml    # Prover configuration
├── programs/              # Solana/Anchor programs
│   └── private_dao/       # On-chain voting logic
│       ├── src/lib.rs     # Program entry
│       └── src/verify.rs  # Groth16 verifier
└── frontend/              # React application
    ├── src/pages/         # App pages
    ├── src/services/      # Chain & proof services
    └── src/lib/           # Utilities`}</pre>
      </div>

      <h2>Links</h2>

      <div className="source-links">
        <a
          href="https://github.com/Yonkoo11/private-dao-voting"
          target="_blank"
          rel="noopener noreferrer"
          className="source-link"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          View Source on GitHub
        </a>
        <a
          href="https://explorer.solana.com/address/AjHU1SCz3uRgvMYbkCW5jgJp5iiLCZc3RhV7A8w5SPX?cluster=devnet"
          target="_blank"
          rel="noopener noreferrer"
          className="source-link"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
          View Program on Solana Explorer
        </a>
        <a
          href="https://noir-lang.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="source-link"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
          Learn about Noir
        </a>
      </div>
    </div>
  );
}
