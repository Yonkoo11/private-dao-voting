#!/usr/bin/env node
/**
 * Register Voter CLI
 *
 * Add a voter to the eligible voters merkle tree for a proposal.
 *
 * Usage:
 *   npx ts-node src/register-voter.ts --proposal <id> --secret <secret>
 *   npx ts-node src/register-voter.ts --proposal <id> --commitment <hex>
 *
 * Examples:
 *   npx ts-node src/register-voter.ts --proposal 1 --secret "my-secret-key"
 *   npx ts-node src/register-voter.ts --proposal 1 --commitment 0x1234...
 */

import { VoterRegistry, computeLeaf, initPoseidon, toHex } from "./voter-registry.js";

function parseArgs(): { proposalId: number; secret?: string; commitment?: string } {
  const args = process.argv.slice(2);
  let proposalId: number | undefined;
  let secret: string | undefined;
  let commitment: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--proposal" || args[i] === "-p") {
      proposalId = parseInt(args[++i]);
    } else if (args[i] === "--secret" || args[i] === "-s") {
      secret = args[++i];
    } else if (args[i] === "--commitment" || args[i] === "-c") {
      commitment = args[++i];
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

  if (!secret && !commitment) {
    console.error("Error: Either --secret or --commitment is required");
    printUsage();
    process.exit(1);
  }

  return { proposalId, secret, commitment };
}

function printUsage() {
  console.log(`
Usage: register-voter [options]

Register a voter as eligible for a proposal.

Options:
  --proposal, -p <id>       Proposal ID (required)
  --secret, -s <secret>     Voter's secret key (will compute commitment)
  --commitment, -c <hex>    Pre-computed voter commitment (hex string)
  --help, -h                Show this help message

Examples:
  register-voter --proposal 1 --secret "my-secret-key"
  register-voter --proposal 1 --commitment 0x1234567890abcdef...

The voter commitment is hash(secret, secret) using Poseidon hash.
`);
}

function secretToField(secret: string): bigint {
  // Simple hash of string to field element
  let hash = BigInt(0);
  for (let i = 0; i < secret.length; i++) {
    hash = (hash * BigInt(256) + BigInt(secret.charCodeAt(i))) % (BigInt(2) ** BigInt(254));
  }
  return hash;
}

async function main() {
  const { proposalId, secret, commitment } = parseArgs();

  console.log(`\n=== Private DAO Voting - Voter Registration ===\n`);

  await initPoseidon();

  const registry = new VoterRegistry(proposalId);
  await registry.load();

  let result: { leaf: bigint; index: number };

  if (secret) {
    const secretField = secretToField(secret);
    const leaf = computeLeaf(secretField);

    console.log(`Proposal:    ${proposalId}`);
    console.log(`Secret:      ${secret.substring(0, 4)}...`);
    console.log(`Commitment:  ${toHex(leaf)}`);

    result = registry.addVoterByCommitment(leaf);
  } else if (commitment) {
    const commitmentBigInt = BigInt(commitment);

    console.log(`Proposal:    ${proposalId}`);
    console.log(`Commitment:  ${toHex(commitmentBigInt)}`);

    result = registry.addVoterByCommitment(commitmentBigInt);
  } else {
    throw new Error("No secret or commitment provided");
  }

  const root = registry.computeRoot();

  console.log(`\n--- Registration Complete ---`);
  console.log(`Voter Index: ${result.index}`);
  console.log(`Total Voters: ${registry.getVoterCount()}`);
  console.log(`Voters Root: ${toHex(root)}`);
  console.log(`\nSave this voters_root for proposal creation.`);

  // Show bytes32 format for Solana
  const rootHex = root.toString(16).padStart(64, "0");
  const rootBytes = [];
  for (let i = 0; i < 64; i += 2) {
    rootBytes.push(`0x${rootHex.slice(i, i + 2)}`);
  }
  console.log(`\n--- Solana Format (bytes32) ---`);
  console.log(`[${rootBytes.join(", ")}]`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
