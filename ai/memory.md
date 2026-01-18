# Memory - Private DAO Voting

## Project Identity

**Purpose**: First browser-based private voting on Solana using zero-knowledge proofs

**Core Innovation**: Enables voters to prove membership and cast votes without revealing identity, preventing vote buying and coercion.

## Architecture Decisions

### ZK Stack
- **Circuit**: Noir (Aztec) - Chosen for Groth16 support and WASM compatibility
- **Hash**: Poseidon2 - ZK-optimized, ~300 constraints vs 25k for SHA256
- **Proof System**: Groth16 via Barretenberg - 192 byte proofs, ~200k CU verification
- **Curve**: BN254 - 128-bit security, Solana altbn254 syscall support

### Merkle Tree
- Depth: 20 levels (~1M voters)
- Can adjust depth based on DAO size (10 = 1k, 25 = 33M voters)

### On-chain Program
- Anchor framework (0.32.0)
- PDAs for proposals (seeded by proposal_id)
- PDAs for nullifiers (seeded by proposal + nullifier)

## Key Insights

1. **Privacy vs Coercion Resistance**
   - Vote value is public (for tallying)
   - Voter identity is hidden (ZK proof)
   - This prevents vote buying but allows seeing aggregate results

2. **Nullifier Design**
   - `nullifier = Poseidon(secret, proposal_id)`
   - Same voter + same proposal = same nullifier
   - Cannot link nullifier back to voter (one-way function)

3. **Trust Assumptions**
   - Currently: Off-chain verifier trusted
   - With groth16-solana: Only Solana consensus trusted
   - Voter tree authority still semi-trusted

## Technical Details

### Circuit Metrics
- ACIR Opcodes: 7,039
- Public Inputs: 4 (voters_root, nullifier, proposal_id, vote)
- Private Inputs: 42 (secret + 20 path indices + 20 siblings)

### Performance
- Browser proving: 12-35 seconds
- Native proving: 2-4 seconds
- On-chain verification: ~200k CU (when enabled)

## Files to Know

| File | Purpose |
|------|---------|
| `circuits/private_vote/src/main.nr` | ZK circuit (19 tests) |
| `programs/.../src/lib.rs` | Solana program with verification structure |
| `SECURITY.md` | Formal threat model |
| `BENCHMARKS.md` | Performance metrics |

## Gotchas

1. **groth16-solana dependency**: blake3 requires edition2024, blocks compilation
2. **Proof format**: Barretenberg output needs conversion for groth16-solana
3. **Frontend build**: Can crash with memory issues (Vite + large WASM)

## Hackathon Strategy

Focus on:
1. Cryptographic rigor (documented assumptions)
2. Novel application (first on Solana, browser-based)
3. Security analysis (threat model, attack vectors)
4. Test coverage (proves correctness)
