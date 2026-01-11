/**
 * Chain Configuration
 * Maps blockchain chain IDs to SideShift network identifiers
 */

/**
 * Mapping of Wagmi/Viem chain IDs to SideShift network names
 */
export const CHAIN_TO_NETWORK_MAP: Record<number, string> = {
  // Ethereum
  1: 'ethereum',

  // Mantle
  5000: 'mantle',
  5003: 'mantleSepolia',

  // BSC
  56: 'bsc',
  97: 'bscTestnet',

  // Polygon
  137: 'polygon',
  80001: 'polygonMumbai',

  // Arbitrum
  42161: 'arbitrum',
  421614: 'arbitrumSepolia',

  // Optimism
  10: 'optimism',
  11155420: 'optimismSepolia',

  // Avalanche
  43114: 'avalanche',
  43113: 'avalancheFuji',
} as const;

/**
 * Get SideShift network identifier for a given chain ID
 * @param chainId - The blockchain chain ID
 * @returns SideShift network identifier (e.g., 'base', 'ethereum')
 */
export function getNetworkForChain(chainId: number): string {
  const network = CHAIN_TO_NETWORK_MAP[chainId];
  if (!network) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return network;
}

/**
 * Get chain ID for a SideShift network identifier
 * @param network - SideShift network identifier
 * @returns Chain ID, or undefined if not found
 */
export function getChainForNetwork(network: string): number | undefined {
  const entry = Object.entries(CHAIN_TO_NETWORK_MAP).find(
    ([_, net]) => net.toLowerCase() === network.toLowerCase()
  );
  return entry ? parseInt(entry[0]) : undefined;
}

/**
 * Check if a chain ID is supported
 * @param chainId - The blockchain chain ID
 * @returns True if chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in CHAIN_TO_NETWORK_MAP;
}
