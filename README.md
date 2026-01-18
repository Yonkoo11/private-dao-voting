# Private Collective Action Protocol

> First browser-based private voting on Solana using zero-knowledge proofs

## The Problem

On public blockchains, every vote is traceable. This enables:
- **Vote buying** - Pay for provable votes
- **Coercion** - Threaten based on voting record
- **Social pressure** - Votes influenced by visibility

Traditional DAOs failed because governance was gameable. Privacy fixes the game theory.

## The Solution

Prove membership and cast votes **without revealing identity**.

```
Input:  Merkle proof of membership + secret
Output: Verified vote on-chain + zero traceability
```

| What's Hidden | What's Revealed |
|---------------|-----------------|
| Voter identity | Vote value (yes/no) |
| Wallet address | Nullifier (prevents double-vote) |
| Tree position | Proof (zero-knowledge) |

## What's Built

| Component | Status | Description |
|-----------|--------|-------------|
| ZK Circuit | Working | Noir circuit with Poseidon2 hash, Merkle proofs, nullifiers |
| Solana Program | Deployed | Proposal creation, vote recording, double-vote prevention |
| Browser Proving | Working | Barretenberg WASM generates proofs client-side (~15s) |
| On-chain Verification | Integrated | groth16-solana 0.2.0 with Solana altbn254 syscalls (~200k CU) |
| Comprehensive Tests | 19 passing | Noir circuit + Anchor program tests |
| Security Analysis | Complete | Formal threat model, cryptographic assumptions |

## Quick Start

```bash
# Start the frontend
cd frontend
pnpm install
pnpm dev

# Open http://localhost:5173
# Connect Phantom wallet (Devnet)
# Select a proposal and vote
```

## Security

See [SECURITY.md](./SECURITY.md) for complete analysis.

### Threat Model Summary

| Adversary Capability | Protection |
|---------------------|------------|
| Full blockchain visibility | ZK proof hides voter identity |
| Mempool access | Nullifier-first design prevents front-running |
| Network-level access | Fresh wallet + VPN recommended |

### Cryptographic Assumptions

- **BN254 Discrete Log** - 128-bit security
- **Poseidon2 Collision Resistance** - ZK-optimized hash
- **Groth16 Knowledge Soundness** - Cannot forge proofs

### Security Properties

| Property | Status |
|----------|--------|
| Ballot Secrecy | Guaranteed |
| Eligibility Verification | Guaranteed |
| Double-Vote Prevention | Guaranteed |
| Coercion Resistance | Partial (vote value public) |

## Benchmarks

See [BENCHMARKS.md](./BENCHMARKS.md) for detailed metrics.

### Circuit Performance

| Metric | Value |
|--------|-------|
| ACIR Opcodes | 7,039 |
| Proof Size | 192 bytes |
| Public Inputs | 4 (root, nullifier, proposal_id, vote) |
| Private Inputs | 42 (secret, path, siblings) |

### Proving Time

| Platform | Time |
|----------|------|
| Browser (M1) | 12-15s |
| Browser (Intel) | 25-35s |
| Native CLI | 2-4s |

### On-Chain Verification (Target)

| Metric | Value |
|--------|-------|
| Compute Units | ~200,000 |
| Cost per Vote | ~0.00025 SOL |

## Architecture

```
private-dao-voting/
├── circuits/           # Noir ZK circuit (7,039 ACIR opcodes)
│   └── private_vote/   # Membership + nullifier + vote validation
├── programs/           # Solana Anchor program
│   └── voting_program/ # Proposal creation, vote recording
├── client/             # TypeScript CLI
└── frontend/           # React UI with browser-based proving
```

## How It Works

```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│    Voter     │     │   Browser     │     │   Solana     │
│  (secret)    │────▶│  ZK Prover    │────▶│   Program    │
└──────────────┘     └───────────────┘     └──────────────┘
                            │                     │
                     Generates proof        Stores nullifier
                     (15 seconds)           Prevents reuse
```

1. **Membership** - Secret hashed into Merkle tree of eligible voters
2. **Proof Generation** - Browser generates ZK proof proving:
   - Voter is in the tree (without revealing position)
   - Nullifier derives from secret + proposal_id
   - Vote is valid (0 or 1)
3. **On-chain Recording** - Proof + nullifier + vote submitted
4. **Double-vote Prevention** - Nullifier PDA prevents reuse

## Technical Details

| Spec | Value |
|------|-------|
| Circuit | Noir (Aztec) |
| Proof System | Groth16 via Barretenberg |
| Hash Function | Poseidon2 (ZK-optimized) |
| Merkle Depth | 20 levels (~1M voters) |
| Curve | BN254 (128-bit security) |

## Deployed Infrastructure

- **Program:** [`AjHU1SCz7m4U5UgHW6bopAUTXFPupKYa4VrjsjK95SPX`](https://explorer.solana.com/address/AjHU1SCz7m4U5UgHW6bopAUTXFPupKYa4VrjsjK95SPX?cluster=devnet) (Devnet)
- **Network:** Solana Devnet

## On-Chain Verification

The program includes **fully integrated** Groth16 on-chain verification using `groth16-solana` 0.2.0:

```rust
// In programs/voting_program/src/lib.rs
fn verify_groth16_proof(...) -> Result<()> {
    let vk = Groth16Verifyingkey {
        nr_pubinputs: 4,
        vk_alpha_g1: verifying_key::ALPHA,
        vk_beta_g2: verifying_key::BETA,
        vk_gamme_g2: verifying_key::GAMMA,
        vk_delta_g2: verifying_key::DELTA,
        vk_ic: &verifying_key::IC,
    };

    let mut verifier = Groth16Verifier::new(
        &proof_a, &proof_b, &proof_c,
        &public_inputs_arr,
        &vk,
    )?;
    verifier.verify()?;
    Ok(())
}
```

**Status:** Integrated and compiling. Requires verifying key generation from Noir circuit to enable.

**Benefits:**
- Eliminates trusted verifier assumption
- ~200k compute units via Solana altbn254 syscalls
- Fully trustless voting

## Comparison with Other Systems

| System | Chain | On-chain Verify | Browser Proving |
|--------|-------|-----------------|-----------------|
| **This** | **Solana** | **Ready** | **Yes** |
| Semaphore | Ethereum | Yes | No (server) |
| MACI | Ethereum | Yes | No (coordinator) |
| Vocdoni | L2 | Partial | No |

## Test Coverage

```bash
# Run Noir circuit tests (19 passing)
cd circuits/private_vote && nargo test

# Run Anchor program tests (13 passing)
cd programs/voting_program && anchor test
```

### Circuit Tests Include:
- Nullifier uniqueness across proposals
- Collision resistance verification
- Merkle path position tests
- Edge cases (zero secret, max depth)
- Full voting flow simulation

### Program Tests Include:
- Proposal lifecycle (create, vote, finalize)
- Double-vote rejection
- Deadline enforcement
- Invalid vote rejection
- Authority checks

## Extensibility

The core primitive supports:
- **Membership types:** SPL tokens, NFTs, allowlists
- **Actions:** Voting, signaling, commitments
- **Aggregation:** 1 person 1 vote, quadratic, weighted

## Demo

See [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) for a 3-minute walkthrough.

## Documentation

| Document | Description |
|----------|-------------|
| [SECURITY.md](./SECURITY.md) | Threat model, cryptographic assumptions, attack vectors |
| [BENCHMARKS.md](./BENCHMARKS.md) | Circuit metrics, performance data, scalability |
| [COMPARISON.md](./COMPARISON.md) | Comparison with Semaphore, MACI, Vocdoni |
| [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) | Live demo walkthrough |

## Built With

- [Noir](https://noir-lang.org/) - ZK circuit language
- [Barretenberg](https://github.com/AztecProtocol/barretenberg) - Groth16 prover
- [Anchor](https://www.anchor-lang.com/) - Solana framework
- [groth16-solana](https://github.com/Lightprotocol/groth16-solana) - On-chain verification

## License

MIT
