// Program and network constants

export const PROGRAM_ID = 'AjHU1SCz7m4U5UgHW6bopAUTXFPupKYa4VrjsjK95SPX';
export const RPC_ENDPOINT = 'https://api.devnet.solana.com';
export const CLUSTER = 'devnet';

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
