// Program and network constants

export const PROGRAM_ID = 'AjHU1SCz7m4U5UgHW6bopAUTXFPupKYa4VrjsjK95SPX';
export const CLUSTER = 'devnet';

// RPC Configuration
// Using Helius RPC for Privacy Hack bounty eligibility
// Fallback to public devnet RPC if Helius unavailable
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY || '';
const QUICKNODE_ENDPOINT = import.meta.env.VITE_QUICKNODE_ENDPOINT || '';

export const RPC_ENDPOINTS = {
  // Primary: Helius (high-performance, Privacy Hack sponsor)
  helius: HELIUS_API_KEY
    ? `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    : null,
  // Secondary: Quicknode (Privacy Hack sponsor)
  quicknode: QUICKNODE_ENDPOINT || null,
  // Fallback: Public Solana devnet
  solana: 'https://api.devnet.solana.com',
} as const;

// Select best available RPC
export const RPC_ENDPOINT =
  RPC_ENDPOINTS.helius ||
  RPC_ENDPOINTS.quicknode ||
  RPC_ENDPOINTS.solana;

// RPC provider for attribution
export const RPC_PROVIDER = RPC_ENDPOINTS.helius
  ? 'Helius'
  : RPC_ENDPOINTS.quicknode
  ? 'Quicknode'
  : 'Solana';

// Demo proposals for hackathon
export const DEMO_PROPOSAL_IDS = [1, 2, 3, 4];

// Demo voter secret
export const DEMO_VOTER_SECRET = '12345';

// Proof generation stages with timing estimates
export const PROOF_STAGES = [
  { key: 'computing_inputs', label: 'COMPUTING MERKLE PROOF', duration: 500 },
  { key: 'generating_witness', label: 'GENERATING WITNESS', duration: 1000 },
  { key: 'proving', label: 'BUILDING GROTH16 PROOF', duration: 2500 },
  { key: 'submitting', label: 'SUBMITTING TO SOLANA', duration: 500 },
  { key: 'confirming', label: 'CONFIRMING TRANSACTION', duration: 1000 },
] as const;

// Explorer URLs
export const getExplorerUrl = (type: 'tx' | 'address', value: string) => {
  const base = 'https://explorer.solana.com';
  return `${base}/${type}/${value}?cluster=${CLUSTER}`;
};
