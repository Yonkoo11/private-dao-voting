#!/usr/bin/env node
/**
 * Convert sunspot verifying key to groth16-solana Rust format
 *
 * Sunspot VK format (908 bytes total):
 * - Alpha G1 (negated): 64 bytes
 * - Beta G2: 128 bytes
 * - Gamma G2: 128 bytes
 * - Delta G2: 128 bytes
 * - Prepared AB (miller precomputation): 128 bytes
 * - IC count: 4 bytes (little-endian u32)
 * - IC points: count * 64 bytes each (G1 points)
 * - Padding: remaining bytes (zeros)
 *
 * groth16-solana expects big-endian bytes for all curve points.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VK_PATH = path.join(__dirname, '..', 'circuits', 'private_vote', 'target', 'private_vote.vk');

function formatBytes(bytes, indent = '    ') {
  const lines = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, Math.min(i + 16, bytes.length));
    const hexValues = Array.from(chunk).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ');
    lines.push(`${indent}${hexValues},`);
  }
  return lines.join('\n');
}

function main() {
  console.log('Reading verifying key from:', VK_PATH);

  const vkBuffer = fs.readFileSync(VK_PATH);
  console.log(`VK size: ${vkBuffer.length} bytes`);

  let offset = 0;

  // Alpha G1 (64 bytes) - already negated by sunspot
  const alpha = vkBuffer.slice(offset, offset + 64);
  offset += 64;
  console.log(`Alpha G1: ${alpha.length} bytes (offset 0-63)`);

  // Beta G2 (128 bytes)
  const beta = vkBuffer.slice(offset, offset + 128);
  offset += 128;
  console.log(`Beta G2: ${beta.length} bytes (offset 64-191)`);

  // Gamma G2 (128 bytes)
  const gamma = vkBuffer.slice(offset, offset + 128);
  offset += 128;
  console.log(`Gamma G2: ${gamma.length} bytes (offset 192-319)`);

  // Delta G2 (128 bytes)
  const delta = vkBuffer.slice(offset, offset + 128);
  offset += 128;
  console.log(`Delta G2: ${delta.length} bytes (offset 320-447)`);

  // Skip prepared AB (128 bytes) - not needed for groth16-solana
  offset += 128;
  console.log(`Skipping prepared AB (offset 448-575)`);

  // IC count (4 bytes, big-endian)
  const icCount = vkBuffer.readUInt32BE(offset);
  offset += 4;
  console.log(`IC count: ${icCount} (offset 576-579)`);

  if (icCount !== 5) {
    console.error(`Expected 5 IC points (4 public inputs + 1), got ${icCount}`);
    process.exit(1);
  }

  // IC points (5 * 64 = 320 bytes)
  const ic = [];
  for (let i = 0; i < icCount; i++) {
    const icPoint = vkBuffer.slice(offset, offset + 64);
    ic.push(icPoint);
    offset += 64;
  }
  console.log(`IC points: ${ic.length} x 64 bytes`);

  // Generate Rust code
  console.log('\n// ========================================');
  console.log('// Paste this into lib.rs verifying_key module');
  console.log('// ========================================\n');

  console.log('/// Alpha point (G1) - 64 bytes (x: 32 bytes, y: 32 bytes, big-endian)');
  console.log('pub const ALPHA: [u8; 64] = [');
  console.log(formatBytes(alpha));
  console.log('];');
  console.log('');

  console.log('/// Beta point (G2) - 128 bytes (x: 64 bytes, y: 64 bytes, big-endian)');
  console.log('pub const BETA: [u8; 128] = [');
  console.log(formatBytes(beta));
  console.log('];');
  console.log('');

  console.log('/// Gamma point (G2) - 128 bytes');
  console.log('pub const GAMMA: [u8; 128] = [');
  console.log(formatBytes(gamma));
  console.log('];');
  console.log('');

  console.log('/// Delta point (G2) - 128 bytes');
  console.log('pub const DELTA: [u8; 128] = [');
  console.log(formatBytes(delta));
  console.log('];');
  console.log('');

  console.log('/// IC (input commitments) - one per public input + 1');
  console.log('/// IC[0] is the base, IC[1..5] correspond to voters_root, nullifier, proposal_id, vote');
  console.log('pub const IC: [[u8; 64]; 5] = [');
  for (let i = 0; i < ic.length; i++) {
    console.log(`    // IC[${i}]`);
    console.log('    [');
    console.log(formatBytes(ic[i], '        '));
    console.log('    ],');
  }
  console.log('];');
  console.log('');

  console.log('/// Whether on-chain verification is enabled');
  console.log('pub const VERIFICATION_ENABLED: bool = true;');

  // Also write to a file for easy copy-paste
  const outputPath = path.join(__dirname, 'verifying_key.rs');
  let rustCode = `// Auto-generated verifying key from private_vote.vk
// Generated at: ${new Date().toISOString()}

/// Alpha point (G1) - 64 bytes (x: 32 bytes, y: 32 bytes, big-endian)
pub const ALPHA: [u8; 64] = [
${formatBytes(alpha)}
];

/// Beta point (G2) - 128 bytes (x: 64 bytes, y: 64 bytes, big-endian)
pub const BETA: [u8; 128] = [
${formatBytes(beta)}
];

/// Gamma point (G2) - 128 bytes
pub const GAMMA: [u8; 128] = [
${formatBytes(gamma)}
];

/// Delta point (G2) - 128 bytes
pub const DELTA: [u8; 128] = [
${formatBytes(delta)}
];

/// IC (input commitments) - one per public input + 1
/// IC[0] is the base, IC[1..5] correspond to voters_root, nullifier, proposal_id, vote
pub const IC: [[u8; 64]; 5] = [
${ic.map((icPoint, i) => `    // IC[${i}]\n    [\n${formatBytes(icPoint, '        ')}\n    ],`).join('\n')}
];

/// Whether on-chain verification is enabled
pub const VERIFICATION_ENABLED: bool = true;
`;

  fs.writeFileSync(outputPath, rustCode);
  console.log(`\n\nRust code written to: ${outputPath}`);
}

main();
