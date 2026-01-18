# Private Collective Action Protocol - Product Documentation

## Use Case Diagram

```
                              ┌─────────────────────────────────────────┐
                              │     PRIVATE COLLECTIVE ACTION SYSTEM     │
                              └─────────────────────────────────────────┘
                                                  │
        ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
        │                                         │                                         │
        ▼                                         ▼                                         ▼
┌───────────────┐                       ┌───────────────┐                       ┌───────────────┐
│    VOTER      │                       │   AUTHORITY   │                       │   OBSERVER    │
│   (Actor)     │                       │    (Actor)    │                       │    (Actor)    │
└───────────────┘                       └───────────────┘                       └───────────────┘
        │                                         │                                         │
        │                                         │                                         │
        ▼                                         ▼                                         ▼
┌─────────────────────┐               ┌─────────────────────┐               ┌─────────────────────┐
│                     │               │                     │               │                     │
│  ○ Browse Proposals │               │  ○ Create Proposal  │               │  ○ View Results     │
│                     │               │                     │               │                     │
│  ○ Connect Wallet   │               │  ○ Set Voter List   │               │  ○ Verify on        │
│                     │               │    (Merkle Root)    │               │    Explorer         │
│  ○ Enter Secret     │               │                     │               │                     │
│                     │               │  ○ Set Deadline     │               │  ○ Audit Proofs     │
│  ○ Cast Private     │               │                     │               │                     │
│    Vote             │◄─────────────►│  ○ Finalize         │               └─────────────────────┘
│                     │   validates   │    Proposal         │
│  ○ View Vote        │               │                     │
│    Confirmation     │               └─────────────────────┘
│                     │
│  ○ Attempt Double   │
│    Vote (Blocked)   │
│                     │
└─────────────────────┘
        │
        │ generates
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ZK PROOF GENERATION                               │
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Input     │───►│  Compute    │───►│  Generate   │───►│   Submit    │  │
│  │   Secret    │    │  Nullifier  │    │  ZK Proof   │    │  On-Chain   │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
│  Proves: Membership ✓ | Uniqueness ✓ | Vote Validity ✓ | Identity Hidden ✓ │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        │ records
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SOLANA BLOCKCHAIN                                  │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   Proposal      │    │   Nullifier     │    │   Vote Count    │         │
│  │   PDA           │    │   PDA           │    │   State         │         │
│  │                 │    │                 │    │                 │         │
│  │  • voters_root  │    │  • nullifier    │    │  • yes_votes    │         │
│  │  • deadline     │    │  • proposal_ref │    │  • no_votes     │         │
│  │  • authority    │    │  (prevents      │    │  • is_finalized │         │
│  │                 │    │   double vote)  │    │                 │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Use Case Details

| Use Case | Actor | Preconditions | Flow | Postconditions |
|----------|-------|---------------|------|----------------|
| UC-01: Browse Proposals | Voter | Wallet connected | View dashboard → Filter by status | See active proposals |
| UC-02: Cast Private Vote | Voter | Has valid secret, proposal active | Enter secret → Select vote → Generate proof → Submit | Vote recorded, nullifier created |
| UC-03: Double Vote Attempt | Voter | Already voted | Attempt vote → Nullifier check → Rejection | Transaction fails, user notified |
| UC-04: Create Proposal | Authority | Has authority wallet | Define params → Compute root → Submit | Proposal PDA created |
| UC-05: Finalize Proposal | Authority | Voting ended | Call finalize → Compute result | is_finalized = true |
| UC-06: Verify Transaction | Observer | Has tx signature | View on Explorer | Confirm immutability |

---

## Product Requirements Document (PRD)

### 1. Executive Summary

**Product Name:** Private Collective Action Protocol
**Version:** 1.0 (Hackathon MVP)
**Date:** January 2026

**Mission:** Enable private, verifiable group decisions on Solana without revealing voter identity.

**Problem Statement:**
On public blockchains, every vote is traceable. This enables:
- Vote buying (pay for provable votes)
- Coercion (threaten based on voting record)
- Social pressure (votes influenced by visibility)

**Solution:**
Zero-knowledge proofs that prove membership and cast votes without revealing identity.

---

### 2. Product Vision

```
┌────────────────────────────────────────────────────────────────────┐
│                         VISION STATEMENT                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  "Make private collective action as easy as public voting,        │
│   while maintaining cryptographic verifiability."                  │
│                                                                    │
│  TODAY: Private voting primitive for DAOs                          │
│  TOMORROW: Universal privacy layer for any collective action       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

### 3. User Personas

#### Persona 1: DAO Member (Primary)
- **Name:** Alex, 28, DeFi power user
- **Goals:** Vote on treasury decisions without revealing position
- **Pain Points:** Worried about social pressure, front-running, retaliation
- **Usage:** Weekly voting on 2-3 proposals

#### Persona 2: DAO Admin (Secondary)
- **Name:** Morgan, 35, Protocol founder
- **Goals:** Create fair governance without voter manipulation
- **Pain Points:** Whale coordination, vote buying, low participation
- **Usage:** Monthly proposal creation, result analysis

#### Persona 3: Security Researcher (Tertiary)
- **Name:** Sam, 30, ZK enthusiast
- **Goals:** Verify cryptographic guarantees, audit proofs
- **Pain Points:** Opaque voting systems, trust assumptions
- **Usage:** Occasional auditing, proof verification

---

### 4. Functional Requirements

#### 4.1 Core Features (MVP - Complete)

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| F-01 | Anonymous vote casting | P0 | ✅ Done |
| F-02 | Merkle membership proofs | P0 | ✅ Done |
| F-03 | Nullifier-based double-vote prevention | P0 | ✅ Done |
| F-04 | Browser-based proof generation | P0 | ✅ Done |
| F-05 | Proposal creation (CLI) | P0 | ✅ Done |
| F-06 | Vote tallying | P0 | ✅ Done |
| F-07 | Solana Explorer verification | P1 | ✅ Done |
| F-08 | Wallet integration (Phantom) | P1 | ✅ Done |

#### 4.2 Future Features (Roadmap)

| ID | Feature | Priority | Effort |
|----|---------|----------|--------|
| F-09 | On-chain proof verification | P0 | High |
| F-10 | Dynamic voter lists | P1 | Medium |
| F-11 | Weighted/quadratic voting | P1 | Medium |
| F-12 | Multi-choice proposals | P2 | Low |
| F-13 | Vote delegation | P2 | Medium |
| F-14 | SPL token gating | P1 | Medium |

---

### 5. Non-Functional Requirements

| Requirement | Target | Current |
|-------------|--------|---------|
| Proof generation time | < 30s | 10-30s ✅ |
| Proof size | < 500 bytes | 192 bytes ✅ |
| Max voters supported | 1M+ | ~1M (2^20) ✅ |
| Transaction cost | < 0.01 SOL | ~0.005 SOL ✅ |
| Frontend load time | < 3s | ~2s ✅ |
| Mobile support | Touch-friendly | ✅ Done |

---

### 6. Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SYSTEM ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────►│  ZK Prover  │────►│   Solana    │
│   (React)   │     │   (WASM)    │     │  (Anchor)   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │                   │                   │
      ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Wallet    │     │    Noir     │     │  Proposal   │
│  Adapter    │     │   Circuit   │     │    PDA      │
│  (Phantom)  │     │  (Groth16)  │     │             │
└─────────────┘     └─────────────┘     └─────────────┘

STACK:
├── Circuit:    Noir (Aztec) + Poseidon2 hash
├── Proving:    Barretenberg (Groth16)
├── Chain:      Solana Devnet
├── Program:    Anchor (Rust)
├── Frontend:   React 18 + Vite + TypeScript
└── Wallet:     @solana/wallet-adapter
```

---

### 7. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Demo completion rate | 100% | Can complete full voting flow |
| Proof generation success | > 95% | Browser proof works reliably |
| Double-vote prevention | 100% | No duplicate votes possible |
| Privacy guarantee | 100% | No identity leakage |
| Transaction success rate | > 99% | Votes recorded on-chain |

---

### 8. Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Off-chain verification | Trust assumption | Light Protocol integration (future) |
| Single voter list | Limited flexibility | Dynamic membership (future) |
| Binary voting only | Limited use cases | Multi-choice support (future) |
| Manual secret distribution | UX friction | Invite system (future) |

---

## Scalability & Expansion Analysis

### Current Capacity

| Dimension | Current | Theoretical Max | Bottleneck |
|-----------|---------|-----------------|------------|
| Voters per proposal | ~100 (demo) | 1,048,576 (2^20) | Merkle tree depth |
| Concurrent proposals | Unlimited | Unlimited | None |
| Proof size | 192 bytes | 192 bytes | Fixed (Groth16) |
| Proof time | 10-30s | ~5s (optimized) | WASM performance |
| TPS | ~400 (Solana) | ~65,000 | Solana capacity |

### Scaling Vectors

```
┌─────────────────────────────────────────────────────────────────────┐
│                      EXPANSION DIMENSIONS                           │
└─────────────────────────────────────────────────────────────────────┘

VERTICAL SCALING (Deeper)
├── Larger voter sets (increase tree depth to 32 → 4B voters)
├── Faster proofs (GPU acceleration, better WASM)
├── Smaller proofs (Plonk, FRI-based systems)
└── On-chain verification (Light Protocol, Aligned Layer)

HORIZONTAL SCALING (Wider)
├── Multi-choice voting (enum votes, ranked choice)
├── Weighted voting (quadratic, token-weighted)
├── Multiple membership types (NFT, SPL, allowlist)
└── Cross-chain (Ethereum, Cosmos, Polygon)

USE CASE SCALING (Different)
├── Signaling (non-binding votes)
├── Commitments (pledge actions)
├── Claims (prove contributions)
├── Coordination (anonymous matchmaking)
└── Governance (full DAO framework)
```

### Product Expansion Roadmap

```
PHASE 1: VOTING PRIMITIVE (CURRENT)
────────────────────────────────────
✅ Binary voting
✅ Merkle membership
✅ Nullifier double-vote prevention
✅ Browser proving
✅ Solana integration

PHASE 2: ENHANCED VOTING (3-6 months)
────────────────────────────────────
□ On-chain proof verification (Light Protocol)
□ Multi-choice proposals
□ Quadratic voting
□ SPL token gating
□ Dynamic voter lists

PHASE 3: COLLECTIVE ACTIONS SDK (6-12 months)
────────────────────────────────────
□ Modular circuit library (action.noir, tally.noir)
□ Rust/JS SDK packages
□ Adapter system (spl-governance, realms, squads)
□ Plugin architecture
□ Developer documentation

PHASE 4: UNIVERSAL PRIVACY LAYER (12-24 months)
────────────────────────────────────
□ Cross-chain support
□ Commitment schemes
□ Anonymous coordination
□ Privacy-preserving analytics
□ Enterprise features
```

### Market Expansion

| Market | Use Case | Fit |
|--------|----------|-----|
| **DAOs** | Treasury votes, governance | Primary - Perfect fit |
| **Enterprises** | Board voting, sensitive polls | High - Needs compliance features |
| **Unions** | Strike votes, leadership elections | High - Privacy critical |
| **Communities** | Anonymous feedback, consensus | Medium - Lower stakes |
| **Governments** | Citizen polling, referendums | Future - Requires audit trail |

### Technical Scalability

**Can handle:**
- 1M+ voters per proposal (current tree depth)
- 4B+ voters (with tree depth 32)
- Thousands of concurrent proposals
- Global distribution (Solana's network)

**Cannot handle (yet):**
- Real-time tallying (proof generation delay)
- Sub-second voting (10-30s proof time)
- On-chain verification (BPF limits)
- Complex voting rules (circuit constraints)

### Competitive Positioning

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPETITIVE LANDSCAPE                            │
├─────────────────┬─────────────────┬─────────────────┬──────────────┤
│                 │ Us (Private     │ Snapshot        │ Tally        │
│                 │ Collective)     │ (Off-chain)     │ (On-chain)   │
├─────────────────┼─────────────────┼─────────────────┼──────────────┤
│ Privacy         │ ✅ Full ZK      │ ❌ Public       │ ❌ Public    │
│ Verification    │ ⚠️ Off-chain   │ ❌ None         │ ✅ On-chain  │
│ Cost            │ ✅ Low          │ ✅ Free         │ ❌ High gas  │
│ Speed           │ ⚠️ 10-30s      │ ✅ Instant      │ ✅ Fast      │
│ Solana Native   │ ✅ Yes          │ ❌ No           │ ❌ No        │
│ Double-vote     │ ✅ Crypto       │ ⚠️ Signature   │ ✅ On-chain  │
└─────────────────┴─────────────────┴─────────────────┴──────────────┘

UNIQUE VALUE: Only ZK-private voting solution native to Solana
```

---

## Summary

**What we have:** A working private voting primitive with browser-based ZK proofs on Solana.

**What it proves:** Privacy-preserving collective action is technically feasible and user-friendly.

**Where it scales:**
- Vertically: Larger voter sets, faster proofs, on-chain verification
- Horizontally: More voting models, membership types, use cases
- Market: DAOs → Enterprises → Communities → Governments

**Critical path to scale:**
1. On-chain verification (Light Protocol) - Removes trust assumption
2. SDK packaging - Enables developer adoption
3. Multi-chain - Expands addressable market

**Bottom line:** The core primitive works. Scaling is a matter of engineering investment, not fundamental research.
