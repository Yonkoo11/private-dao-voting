# Hackathon Submission Strategy

> Solana Privacy Hack (January 12-30, 2026)

## Tracks We Qualify For

### 1. Open Track - Pool ($18,000) - PRIMARY TARGET

**Why we qualify:**
- Governance is explicitly listed as an "Open Privacy Track" use case
- Supported by Light Protocol (we use groth16-solana from Light Protocol)
- Privacy-preserving voting is a core governance application

**Our pitch:** First browser-based private voting on Solana - enabling coercion-resistant DAO governance.

### 2. Privacy Tooling ($15,000) - SECONDARY TARGET

**Why we qualify:**
- We built reusable ZK voting infrastructure
- Noir circuit can be adapted for other membership proofs
- On-chain verification module is reusable

**Our pitch:** Production-ready ZK membership proof tooling with browser-based proving.

### 3. Private Payments ($15,000) - NOT A FIT

We're doing voting, not payments. Skip this track.

---

## Partner Bounties We Can Target

### Already Integrated

| Partner | Bounty | Status | Integration |
|---------|--------|--------|-------------|
| **Aztec (Noir)** | $10,000 | INTEGRATED | Circuit written in Noir |
| **Light Protocol** | Pool sponsor | INTEGRATED | groth16-solana 0.2.0 for on-chain verification |

### Easy to Add

| Partner | Bounty | Effort | Integration Path |
|---------|--------|--------|------------------|
| **Helius** | $5,000 | Low | Use Helius RPC for frontend |
| **Quicknode** | $3,000 | Low | Use Quicknode RPC |

### Potential (More Work)

| Partner | Bounty | Effort | Integration Path |
|---------|--------|--------|------------------|
| **Arcium** | $10,000 | Medium | Encrypted vote storage before tally |
| **MagicBlock** | $5,000 | Medium | Private ephemeral rollups for voting |
| **Inco** | $6,000 | Medium | Confidential voting with Lightning |

---

## Current Partner Integrations

### 1. Aztec - Noir ($10,000 bounty)

**Integration:** Our entire ZK circuit is written in Noir

```noir
// circuits/private_vote/src/main.nr
use noir_poseidon::poseidon2::Poseidon2;

fn main(
    voters_root: pub Field,
    nullifier: pub Field,
    proposal_id: pub Field,
    vote: pub Field,
    secret: Field,
    path_indices: [u1; TREE_DEPTH],
    siblings: [Field; TREE_DEPTH],
) { ... }
```

**Bounty categories:**
- Best overall: $5k
- Best non-financial use: $2.5k (WE QUALIFY - voting is non-financial)
- Most creative: $2.5k

### 2. Light Protocol (Pool Sponsor)

**Integration:** groth16-solana 0.2.0 for on-chain Groth16 verification

```rust
// programs/voting_program/src/lib.rs
use groth16_solana::groth16::{Groth16Verifier, Groth16Verifyingkey};

let mut verifier = Groth16Verifier::new(
    &proof_a, &proof_b, &proof_c,
    &public_inputs_arr,
    &vk,
)?;
verifier.verify()?;
```

**Qualification:** Using their ZK verification infrastructure for trustless voting.

---

## Bounties to Add Before Submission

### Priority 1: Helius ($5,000)

**What:** Use Helius RPC in frontend

**Implementation:**
```typescript
// frontend/src/lib/solana.ts
const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY";
const connection = new Connection(HELIUS_RPC);
```

**Effort:** 30 minutes

### Priority 2: Quicknode ($3,000)

**What:** Alternative RPC provider

**Implementation:** Same as Helius, just different endpoint

**Effort:** 15 minutes

---

## Total Potential Prize Pool

| Category | Amount | Confidence |
|----------|--------|------------|
| Open Track (1st place) | $18,000 | Medium |
| Privacy Tooling (1st place) | $15,000 | Medium |
| Aztec/Noir bounty | $5,000-$10,000 | High |
| Helius bounty | $5,000 | High (easy integration) |
| Quicknode bounty | $3,000 | High (easy integration) |
| **Maximum potential** | **$51,000** | - |
| **Realistic estimate** | **$15,000-$25,000** | - |

---

## Submission Checklist

### Required
- [x] Open source code
- [x] Solana integration (devnet deployed)
- [ ] 3-minute demo video
- [x] Documentation (README, SECURITY, BENCHMARKS, COMPARISON)

### Recommended
- [x] Working prototype
- [x] Test coverage (32 tests total)
- [x] Security analysis
- [ ] Live demo URL

### For Specific Bounties
- [x] Noir circuit (Aztec bounty)
- [x] groth16-solana integration (Light Protocol)
- [ ] Helius RPC integration
- [ ] Quicknode RPC integration

---

## Demo Video Script (3 minutes)

### 0:00-0:30 - Problem Statement
"Traditional DAO voting is broken. Every vote is public, enabling vote buying and coercion."

### 0:30-1:30 - Solution Demo
- Show frontend connecting to Phantom
- Select a proposal
- Generate ZK proof (show 15-second timer)
- Submit vote
- Show transaction on Solana Explorer

### 1:30-2:30 - Technical Innovation
- Browser-based ZK proving (first on Solana)
- Noir circuit with 7,039 ACIR opcodes
- On-chain Groth16 verification via groth16-solana
- 32 tests proving correctness

### 2:30-3:00 - Why This Matters
- Privacy prevents vote buying
- Nullifiers prevent double-voting
- Solana provides 400 TPS at $0.0002/vote
- Open source, production-ready

---

## Differentiation from Competition

| Feature | Our Project | Others |
|---------|-------------|--------|
| Browser proving | Yes | Typically server-side |
| On-chain verify | Integrated | Often off-chain |
| Chain | Solana (fast, cheap) | Usually Ethereum |
| Test coverage | 32 tests | Often minimal |
| Security analysis | Formal threat model | Often missing |
| Documentation | 4 detailed docs | Usually just README |

---

## Action Items Before Submission

1. [ ] Add Helius RPC to frontend (30 min)
2. [ ] Add Quicknode as fallback RPC (15 min)
3. [ ] Record 3-minute demo video
4. [ ] Deploy frontend to Vercel
5. [ ] Submit to tracks: Open + Privacy Tooling
6. [ ] Submit to bounties: Aztec, Helius, Quicknode

---

## Links

- [Privacy Hack Official](https://solana.com/privacyhack)
- [Encode Club](https://www.encode.club/)
- [Aztec Noir](https://noir-lang.org/)
- [Light Protocol](https://lightprotocol.com/)
- [Helius](https://helius.dev/)
