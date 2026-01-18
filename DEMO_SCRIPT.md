# Private Collective Action SDK - Demo Script (3 minutes)

## Recording Setup
- Terminal window (dark theme, large font)
- Browser with Solana Explorer open
- Frontend at http://localhost:5173/
- Phantom wallet connected to Devnet

---

## INTRO (0:00 - 0:30)

**Show: Frontend UI**

"This is Private DAO Voting - a zero-knowledge voting system built on Solana using Noir circuits.

The problem: In traditional DAO voting, everyone can see who voted for what. This creates social pressure and potential retaliation.

Our solution: Voters prove they're eligible WITHOUT revealing their identity, using ZK proofs generated with Noir and verified on Solana."

---

## ARCHITECTURE (0:30 - 1:00)

**Show: Terminal with project structure**

```bash
cd /Users/yonko/solana-privacy-hackathon/private-dao-voting
ls -la
```

"The system has three parts:

1. **Noir Circuit** - Generates ZK proofs proving voter eligibility
2. **Solana Program** - Stores proposals and votes on-chain
3. **Client** - Connects the two, generating proofs and submitting transactions"

---

## LIVE DEMO - Create Proposal (1:00 - 1:30)

**Show: Terminal**

```bash
cd client
node dist/create-proposal.js
```

"Let's create a new proposal. The voters merkle root is computed from eligible voter secrets.

*Wait for transaction*

The proposal is now live on Solana devnet. Let's verify on the explorer."

**Show: Solana Explorer - click the transaction link**

---

## LIVE DEMO - Cast Vote (1:30 - 2:20)

**Show: Terminal**

```bash
# Cast a YES vote with secret 12345
node dist/cast-vote.js 1 1 12345
```

"Now let's cast a private vote. Watch the proof generation...

The Noir circuit proves:
- I'm in the voter list (without revealing which voter)
- I haven't voted yet (using a nullifier)
- My vote is valid (0 or 1)

*Wait for proof generation (~3 seconds)*

The proof is 464 bytes. It's submitted to Solana and the vote is recorded."

**Show: Solana Explorer - click the vote transaction link**

---

## DEMO - Double Vote Prevention (2:20 - 2:45)

**Show: Terminal**

```bash
# Try to vote again with same secret
node dist/cast-vote.js 1 0 12345
```

"What if someone tries to vote twice? Let's try...

*Wait for error*

The nullifier account already exists! The same voter cannot vote twice, even though we don't know WHO they are. This is the magic of ZK proofs."

---

## CLOSING (2:45 - 3:00)

**Show: Frontend UI**

"Private DAO Voting enables anonymous, verifiable voting on Solana.

Built with:
- Noir for ZK circuits
- Sunspot for Solana proof generation
- Anchor for the on-chain program

All code is open source. Thank you!"

---

## ALTERNATIVE: Frontend Demo (Browser-Based Voting)

**Show: Browser at http://localhost:5173**

### Step 1: Dashboard
"The frontend fetches live proposals from Solana devnet. These are real on-chain records."

### Step 2: Select Proposal
- Click on an active proposal
- Show the voting interface

### Step 3: Cast Vote
1. Enter voter secret: `12345`
2. Select "Approve" or "Reject"
3. Click "Submit Vote"

**Show: Progress bar during proof generation (~10-30 seconds)**

"Watch the ZK proof being generated in your browser. This is real Noir + Barretenberg WASM running client-side.

The proof proves:
- I'm in the voter list (Merkle inclusion)
- I haven't voted yet (nullifier)
- My vote is valid (0 or 1)"

### Step 4: Transaction Confirmation
- Show the Solana Explorer link
- Click to verify the on-chain transaction

"The vote is now recorded on Solana. The transaction stores the proof and nullifier, but my identity is completely hidden."

---

## Commands Quick Reference

```bash
# Start frontend (browser-based ZK proving)
cd /Users/yonko/solana-privacy-hackathon/private-dao-voting/frontend
pnpm dev

# Create proposal via CLI
cd /Users/yonko/solana-privacy-hackathon/private-dao-voting/client
node dist/create-proposal.js 4 "Treasury Allocation" "Allocate 1000 SOL"

# Cast vote via CLI (proposal_id, vote, secret)
node dist/cast-vote.js 4 1 12345

# Try double vote (will fail - nullifier exists)
node dist/cast-vote.js 4 0 12345
```

## Key Links to Show

- Program: https://explorer.solana.com/address/AjHU1SCz7m4U5UgHW6bopAUTXFPupKYa4VrjsjK95SPX?cluster=devnet
- Fresh Proposal 3: https://explorer.solana.com/address/9DdNM4qwc3Fe8a1YkJyYrKcBuXNu9vkEo4y4ywgMJfia?cluster=devnet

## Recording Tips

1. Use a screen recorder like OBS, Loom, or QuickTime
2. Set terminal font to 16pt+ for readability
3. Pause briefly after each command to show output
4. Keep energy up but speak clearly
5. Total time: aim for 2:30-3:00
