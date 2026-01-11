/**
 * Subgraph configuration for MantlePulse
 */

export const SUBGRAPH_URLS: Record<number, string> = {
  // Mantle Mainnet
  5000: 'https://subgraph.mantle.xyz/subgraphs/name/mantlepulse-mainnet',
  // Mantle Sepolia
  5003: 'https://subgraph.mantle.xyz/subgraphs/name/mantlepulse-sepolia',
};

// Global stats ID in the subgraph (hex encoded "global")
export const GLOBAL_STATS_ID = '0x676c6f62616c';
