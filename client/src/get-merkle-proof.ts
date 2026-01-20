#!/usr/bin/env node
/**
 * Get Merkle Proof CLI
 *
 * Generate a merkle proof for a registered voter.
 *
 * Usage:
 *   npx ts-node src/get-merkle-proof.ts --proposal <id> --secret <secret>
 *
 * Examples:
 *   npx ts-node src/get-merkle-proof.ts --proposal 1 --secret "my-secret-key"
 */

import { VoterRegistry, computeNullifier, initPoseidon, toHex } from "./voter-registry.js";

function parseArgs(): { proposalId: number; secret: string; outputJson?: boolean } {
  const args = process.argv.slice(2);
  let proposalId: number | undefined;
  let secret: string | undefined;
  let outputJson = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--proposal" || args[i] === "-p") {
      proposalId = parseInt(args[++i]);
    } else if (args[i] === "--secret" || args[i] === "-s") {
      secret = args[++i];
    } else if (args[i] === "--json" || args[i] === "-j") {
      outputJson = true;
    } else if (args[i] === "--help" || args[i] === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  if (!proposalId || !secret) {
    console.error("Error: --proposal and --secret are required");
    printUsage();
    process.exit(1);
  }

  return { proposalId, secret, outputJson };
}

function printUsage() {
  console.log(`
Usage: get-merkle-proof [options]

Generate a merkle proof for a registered voter.

Options:
  --proposal, -p <id>       Proposal ID (required)
  --secret, -s <secret>     Voter's secret key (required)
  --json, -j                Output as JSON
  --help, -h                Show this help message

Examples:
  get-merkle-proof --proposal 1 --secret "my-secret-key"
  get-merkle-proof --proposal 1 --secret "my-secret-key" --json
`);
}

function secretToField(secret: string): bigint {
  let hash = BigInt(0);
  for (let i = 0; i < secret.length; i++) {
    hash = (hash * BigInt(256) + BigInt(secret.charCodeAt(i))) % (BigInt(2) ** BigInt(254));
  }
  return hash;
}

async function main() {
  const { proposalId, secret, outputJson } = parseArgs();

  await initPoseidon();

  const registry = new VoterRegistry(proposalId);
  await registry.load();

  if (registry.getVoterCount() === 0) {
    console.error(`Error: No voters registered for proposal ${proposalId}`);
    process.exit(1);
  }

  const secretField = secretToField(secret);

  if (!registry.isVoterRegistered(secretField)) {
    console.error(`Error: Voter not found. Secret does not match any registered voter.`);
    process.exit(1);
  }

  const proof = registry.getMerkleProofBySecret(secretField);
  const nullifier = computeNullifier(secretField, BigInt(proposalId));

  if (outputJson) {
    // Output as JSON for programmatic use
    const output = {
      proposalId,
      votersRoot: toHex(proof.root),
      leaf: toHex(proof.leaf),
      nullifier: toHex(nullifier),
      pathIndices: proof.pathIndices,
      siblings: proof.siblings.map((s) => toHex(s)),
      // Circuit-ready format
      circuitInputs: {
        voters_root: proof.root.toString(),
        nullifier: nullifier.toString(),
        proposal_id: proposalId.toString(),
        secret: secretField.toString(),
        path_indices: proof.pathIndices,
        siblings: proof.siblings.map((s) => s.toString()),
      },
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    // Human-readable output
    console.log(`\n=== Private DAO Voting - Merkle Proof ===\n`);
    console.log(`Proposal ID:  ${proposalId}`);
    console.log(`Voters Root:  ${toHex(proof.root)}`);
    console.log(`Your Leaf:    ${toHex(proof.leaf)}`);
    console.log(`Nullifier:    ${toHex(nullifier)}`);
    console.log(`\n--- Path Indices (20 levels) ---`);
    console.log(proof.pathIndices.join(", "));
    console.log(`\n--- Siblings (20 levels) ---`);
    proof.siblings.forEach((s, i) => {
      const isNonZero = s !== BigInt(0);
      console.log(`[${i.toString().padStart(2, "0")}] ${toHex(s)}${isNonZero ? "" : " (zero)"}`);
    });

    console.log(`\n--- Prover.toml Format ---`);
    console.log(`secret = "${secretField}"`);
    console.log(`proposal_id = "${proposalId}"`);
    console.log(`vote = "1"`);
    console.log(`nullifier = "${nullifier}"`);
    console.log(`voters_root = "${proof.root}"`);
    console.log(`path_indices = [${proof.pathIndices.join(", ")}]`);
    console.log(`siblings = [${proof.siblings.map((s) => `"${s}"`).join(", ")}]`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
