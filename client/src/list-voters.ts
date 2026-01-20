#!/usr/bin/env node
/**
 * List Voters CLI
 *
 * Show all registered voters for a proposal.
 *
 * Usage:
 *   npx ts-node src/list-voters.ts --proposal <id>
 *
 * Examples:
 *   npx ts-node src/list-voters.ts --proposal 1
 */

import { VoterRegistry, initPoseidon, toHex } from "./voter-registry.js";

function parseArgs(): { proposalId: number } {
  const args = process.argv.slice(2);
  let proposalId: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--proposal" || args[i] === "-p") {
      proposalId = parseInt(args[++i]);
    } else if (args[i] === "--help" || args[i] === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  if (!proposalId) {
    console.error("Error: --proposal is required");
    printUsage();
    process.exit(1);
  }

  return { proposalId };
}

function printUsage() {
  console.log(`
Usage: list-voters [options]

Show all registered voters for a proposal.

Options:
  --proposal, -p <id>       Proposal ID (required)
  --help, -h                Show this help message

Examples:
  list-voters --proposal 1
`);
}

async function main() {
  const { proposalId } = parseArgs();

  await initPoseidon();

  const registry = new VoterRegistry(proposalId);
  await registry.load();

  const commitments = registry.getAllCommitments();
  const root = registry.computeRoot();

  console.log(`\n=== Private DAO Voting - Voter Registry ===\n`);
  console.log(`Proposal ID:  ${proposalId}`);
  console.log(`Total Voters: ${commitments.length}`);
  console.log(`Voters Root:  ${toHex(root)}`);

  if (commitments.length > 0) {
    console.log(`\n--- Registered Voter Commitments ---`);
    commitments.forEach((commitment, index) => {
      console.log(`[${index.toString().padStart(3, "0")}] ${toHex(commitment)}`);
    });
  } else {
    console.log(`\nNo voters registered yet.`);
    console.log(`Use 'npm run register-voter -- --proposal ${proposalId} --secret "your-secret"' to add voters.`);
  }

  // Show Solana-ready format
  console.log(`\n--- Voters Root (Solana format) ---`);
  const rootHex = root.toString(16).padStart(64, "0");
  const rootBytes = [];
  for (let i = 0; i < 64; i += 2) {
    rootBytes.push(`0x${rootHex.slice(i, i + 2)}`);
  }
  console.log(`[${rootBytes.join(", ")}]`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
