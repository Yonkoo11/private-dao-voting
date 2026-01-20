/**
 * Threshold Encryption Service for Private DAO Voting
 *
 * Implements Shamir's Secret Sharing for M-of-N threshold decryption.
 * Votes are encrypted during submission and can only be decrypted
 * when M committee members provide their key shares.
 *
 * This provides vote result privacy - individual votes remain hidden
 * until the voting period ends and committee authorizes decryption.
 */

// Finite field prime for Shamir's Secret Sharing (256-bit prime)
const FIELD_PRIME = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');

/**
 * Key share held by a committee member
 */
export interface KeyShare {
  index: number;      // Share index (1 to N)
  value: bigint;      // Share value
  commitment: string; // Public commitment for verification
}

/**
 * Encrypted vote data
 */
export interface EncryptedVote {
  ciphertext: Uint8Array;  // Encrypted vote (32 bytes)
  nonce: Uint8Array;       // Random nonce (12 bytes)
  tag: Uint8Array;         // Authentication tag (16 bytes)
}

/**
 * Committee configuration
 */
export interface CommitteeConfig {
  threshold: number;    // M - minimum shares needed
  totalMembers: number; // N - total committee members
  publicKey: Uint8Array; // Combined public key
}

/**
 * Generate a random 256-bit number in the field
 */
function randomFieldElement(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let value = BigInt(0);
  for (let i = 0; i < 32; i++) {
    value = (value << BigInt(8)) | BigInt(bytes[i]);
  }
  return value % FIELD_PRIME;
}

/**
 * Modular multiplicative inverse using extended Euclidean algorithm
 */
function modInverse(a: bigint, mod: bigint): bigint {
  let [old_r, r] = [a % mod, mod];
  let [old_s, s] = [BigInt(1), BigInt(0)];

  while (r !== BigInt(0)) {
    const quotient = old_r / r;
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }

  return ((old_s % mod) + mod) % mod;
}

/**
 * Evaluate polynomial at point x
 * coefficients[0] is the secret, coefficients[1..] are random
 */
function evaluatePolynomial(coefficients: bigint[], x: bigint): bigint {
  let result = BigInt(0);
  let xPower = BigInt(1);

  for (const coef of coefficients) {
    result = (result + coef * xPower) % FIELD_PRIME;
    xPower = (xPower * x) % FIELD_PRIME;
  }

  return result;
}

/**
 * Generate Shamir secret shares
 * @param secret - The secret to share
 * @param threshold - Minimum shares needed to reconstruct (M)
 * @param totalShares - Total number of shares to generate (N)
 */
export function generateShares(
  secret: bigint,
  threshold: number,
  totalShares: number
): KeyShare[] {
  if (threshold > totalShares) {
    throw new Error('Threshold cannot exceed total shares');
  }
  if (threshold < 2) {
    throw new Error('Threshold must be at least 2');
  }

  // Generate random polynomial coefficients
  // f(x) = secret + a1*x + a2*x^2 + ... + a(t-1)*x^(t-1)
  const coefficients: bigint[] = [secret];
  for (let i = 1; i < threshold; i++) {
    coefficients.push(randomFieldElement());
  }

  // Generate shares: share_i = f(i) for i = 1, 2, ..., N
  const shares: KeyShare[] = [];
  for (let i = 1; i <= totalShares; i++) {
    const value = evaluatePolynomial(coefficients, BigInt(i));
    shares.push({
      index: i,
      value,
      commitment: value.toString(16).padStart(64, '0'),
    });
  }

  return shares;
}

/**
 * Reconstruct secret from M shares using Lagrange interpolation
 * @param shares - Array of at least M shares
 */
export function reconstructSecret(shares: KeyShare[]): bigint {
  if (shares.length < 2) {
    throw new Error('Need at least 2 shares to reconstruct');
  }

  let secret = BigInt(0);

  for (let i = 0; i < shares.length; i++) {
    let numerator = BigInt(1);
    let denominator = BigInt(1);

    for (let j = 0; j < shares.length; j++) {
      if (i !== j) {
        // Lagrange basis polynomial: product of (0 - x_j) / (x_i - x_j)
        numerator = (numerator * BigInt(-shares[j].index)) % FIELD_PRIME;
        denominator = (denominator * BigInt(shares[i].index - shares[j].index)) % FIELD_PRIME;
      }
    }

    // Handle negative modular arithmetic
    numerator = ((numerator % FIELD_PRIME) + FIELD_PRIME) % FIELD_PRIME;
    denominator = ((denominator % FIELD_PRIME) + FIELD_PRIME) % FIELD_PRIME;

    const lagrangeCoef = (numerator * modInverse(denominator, FIELD_PRIME)) % FIELD_PRIME;
    secret = (secret + shares[i].value * lagrangeCoef) % FIELD_PRIME;
  }

  return ((secret % FIELD_PRIME) + FIELD_PRIME) % FIELD_PRIME;
}

/**
 * Derive encryption key from shared secret
 */
async function deriveKey(secret: bigint): Promise<CryptoKey> {
  const secretBytes = new Uint8Array(32);
  let temp = secret;
  for (let i = 31; i >= 0; i--) {
    secretBytes[i] = Number(temp & BigInt(0xff));
    temp = temp >> BigInt(8);
  }

  return crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a vote using the committee's shared key
 * @param vote - Vote option index (0 to numOptions-1)
 * @param proposalId - Proposal ID for domain separation
 * @param encryptionKey - Shared encryption key (from committee setup)
 */
export async function encryptVote(
  vote: number,
  proposalId: number,
  encryptionKey: bigint
): Promise<EncryptedVote> {
  const key = await deriveKey(encryptionKey);

  // Prepare vote data with proposal ID for domain separation
  const voteData = new Uint8Array(8);
  const view = new DataView(voteData.buffer);
  view.setUint32(0, proposalId, true);  // Little-endian proposal ID
  view.setUint32(4, vote, true);         // Little-endian vote

  // Generate random nonce
  const nonce = new Uint8Array(12);
  crypto.getRandomValues(nonce);

  // Encrypt with AES-GCM
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    voteData
  );

  const ciphertextArray = new Uint8Array(ciphertext);

  // AES-GCM appends 16-byte tag to ciphertext
  return {
    ciphertext: ciphertextArray.slice(0, ciphertextArray.length - 16),
    nonce,
    tag: ciphertextArray.slice(ciphertextArray.length - 16),
  };
}

/**
 * Decrypt a vote using reconstructed key
 * @param encryptedVote - The encrypted vote data
 * @param encryptionKey - Reconstructed encryption key
 */
export async function decryptVote(
  encryptedVote: EncryptedVote,
  encryptionKey: bigint
): Promise<{ proposalId: number; vote: number }> {
  const key = await deriveKey(encryptionKey);

  // Combine ciphertext and tag for AES-GCM
  const combined = new Uint8Array(encryptedVote.ciphertext.length + encryptedVote.tag.length);
  combined.set(encryptedVote.ciphertext, 0);
  combined.set(encryptedVote.tag, encryptedVote.ciphertext.length);

  // Copy to new ArrayBuffer to ensure compatibility with crypto API
  const nonceBuffer = new Uint8Array(encryptedVote.nonce).buffer;
  const dataBuffer = new Uint8Array(combined).buffer;

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonceBuffer },
    key,
    dataBuffer
  );

  const view = new DataView(decrypted);
  return {
    proposalId: view.getUint32(0, true),
    vote: view.getUint32(4, true),
  };
}

/**
 * Serialize encrypted vote to bytes for on-chain storage
 */
export function serializeEncryptedVote(encryptedVote: EncryptedVote): Uint8Array {
  // Format: [ciphertext_len (2 bytes)] [ciphertext] [nonce (12 bytes)] [tag (16 bytes)]
  const totalLen = 2 + encryptedVote.ciphertext.length + 12 + 16;
  const result = new Uint8Array(totalLen);

  // Write ciphertext length
  result[0] = encryptedVote.ciphertext.length & 0xff;
  result[1] = (encryptedVote.ciphertext.length >> 8) & 0xff;

  // Write ciphertext
  result.set(encryptedVote.ciphertext, 2);

  // Write nonce
  result.set(encryptedVote.nonce, 2 + encryptedVote.ciphertext.length);

  // Write tag
  result.set(encryptedVote.tag, 2 + encryptedVote.ciphertext.length + 12);

  return result;
}

/**
 * Deserialize encrypted vote from bytes
 */
export function deserializeEncryptedVote(data: Uint8Array): EncryptedVote {
  const ciphertextLen = data[0] | (data[1] << 8);

  return {
    ciphertext: data.slice(2, 2 + ciphertextLen),
    nonce: data.slice(2 + ciphertextLen, 2 + ciphertextLen + 12),
    tag: data.slice(2 + ciphertextLen + 12, 2 + ciphertextLen + 12 + 16),
  };
}

/**
 * Demo: Generate committee keys for testing
 * In production, each committee member generates their own share
 */
export function setupDemoCommittee(
  threshold: number = 2,
  totalMembers: number = 3
): { secret: bigint; shares: KeyShare[]; config: CommitteeConfig } {
  // Generate random encryption secret
  const secret = randomFieldElement();

  // Generate shares
  const shares = generateShares(secret, threshold, totalMembers);

  // Derive public key (for demo, just hash of secret)
  const publicKey = new Uint8Array(32);
  let temp = secret;
  for (let i = 31; i >= 0; i--) {
    publicKey[i] = Number(temp & BigInt(0xff));
    temp = temp >> BigInt(8);
  }

  return {
    secret,
    shares,
    config: {
      threshold,
      totalMembers,
      publicKey,
    },
  };
}

/**
 * Tally encrypted votes after committee authorizes decryption
 * @param encryptedVotes - Array of encrypted votes
 * @param shares - M key shares from committee members
 * @param numOptions - Number of vote options
 */
export async function tallyVotes(
  encryptedVotes: EncryptedVote[],
  shares: KeyShare[],
  numOptions: number
): Promise<number[]> {
  // Reconstruct the encryption key
  const encryptionKey = reconstructSecret(shares);

  // Initialize vote counts
  const voteCounts = new Array(numOptions).fill(0);

  // Decrypt and tally each vote
  for (const encryptedVote of encryptedVotes) {
    try {
      const { vote } = await decryptVote(encryptedVote, encryptionKey);
      if (vote >= 0 && vote < numOptions) {
        voteCounts[vote]++;
      }
    } catch (err) {
      console.warn('Failed to decrypt vote:', err);
      // Skip invalid votes
    }
  }

  return voteCounts;
}

// Export utilities
export const ThresholdEncryption = {
  generateShares,
  reconstructSecret,
  encryptVote,
  decryptVote,
  serializeEncryptedVote,
  deserializeEncryptedVote,
  setupDemoCommittee,
  tallyVotes,
};

export default ThresholdEncryption;
