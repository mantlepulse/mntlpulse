/**
 * Currency Utility Functions
 * Client-side helpers for working with cryptocurrencies
 */

/**
 * List of common stablecoins
 */
const STABLECOINS = [
  'USDC',
  'USDT',
  'DAI',
  'BUSD',
  'TUSD',
  'USDD',
  'FRAX',
  'GUSD',
  'USDP',
  'LUSD',
] as const;

/**
 * Check if a coin is a stablecoin
 * @param coin - Coin symbol (e.g., 'USDC', 'BTC')
 * @returns True if the coin is a stablecoin
 */
export function isStablecoin(coin: string): boolean {
  return STABLECOINS.includes(coin.toUpperCase() as any);
}

/**
 * Get the default destination coin based on the source coin
 * - Stablecoins convert to USDC
 * - Other coins convert to ETH
 * @param sourceCoin - The source cryptocurrency
 * @returns Recommended destination coin
 */
export function getDefaultDestinationCoin(sourceCoin: string): string {
  return isStablecoin(sourceCoin) ? 'USDC' : 'ETH';
}

/**
 * Get the display name for a coin
 * @param coin - Coin symbol
 * @returns Human-readable name
 */
export function getCoinDisplayName(coin: string): string {
  const names: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    USDC: 'USD Coin',
    USDT: 'Tether',
    DAI: 'Dai',
    BNB: 'BNB',
    MATIC: 'Polygon',
    AVAX: 'Avalanche',
    ARB: 'Arbitrum',
    OP: 'Optimism',
  };
  return names[coin.toUpperCase()] || coin;
}

/**
 * Format network name for display
 * @param network - Network identifier (e.g., 'baseSepolia', 'bsc')
 * @returns Human-readable network name
 */
export function formatNetworkName(network: string): string {
  const names: Record<string, string> = {
    ethereum: 'Ethereum',
    mantle: 'Mantle',
    mantleSepolia: 'Mantle Sepolia',
    bsc: 'BSC',
    bscTestnet: 'BSC Testnet',
    polygon: 'Polygon',
    polygonMumbai: 'Polygon Mumbai',
    arbitrum: 'Arbitrum',
    arbitrumSepolia: 'Arbitrum Sepolia',
    optimism: 'Optimism',
    optimismSepolia: 'Optimism Sepolia',
    avalanche: 'Avalanche',
    avalancheFuji: 'Avalanche Fuji',
  };
  return names[network] || network.charAt(0).toUpperCase() + network.slice(1);
}

/**
 * Map chain ID to network identifier
 * Used to determine the settlement network for fund-poll operations
 * @param chainId - EVM chain ID (e.g., 5000 for Mantle, 5003 for Mantle Sepolia)
 * @returns Network identifier (e.g., 'mantle', 'mantleSepolia')
 */
export function getNetworkForChain(chainId: number): string {
  const networkMap: Record<number, string> = {
    5000: 'mantle',           // Mantle Mainnet
    5003: 'mantleSepolia',    // Mantle Sepolia Testnet
  };
  return networkMap[chainId] || 'mantle'; // Default to mantle mainnet
}

/**
 * Map chain ID to SideShift network identifier for source deposits
 * Includes all major EVM chains that SideShift supports
 * @param chainId - EVM chain ID
 * @returns SideShift network identifier for deposit (e.g., 'ethereum', 'polygon')
 */
export function getSourceNetworkForChain(chainId: number): string {
  const networkMap: Record<number, string> = {
    // Mainnets
    1: 'ethereum',          // Ethereum Mainnet
    5000: 'mantle',         // Mantle Mainnet
    137: 'polygon',         // Polygon Mainnet
    56: 'bsc',              // BSC Mainnet
    42161: 'arbitrum',      // Arbitrum One
    10: 'optimism',         // Optimism
    43114: 'avalanche',     // Avalanche C-Chain
    250: 'fantom',          // Fantom
    // Testnets
    5003: 'mantleSepolia',  // Mantle Sepolia
    11155111: 'sepolia',    // Ethereum Sepolia
    80001: 'polygonMumbai', // Polygon Mumbai
    97: 'bscTestnet',       // BSC Testnet
    421614: 'arbitrumSepolia', // Arbitrum Sepolia
  };
  return networkMap[chainId] || 'ethereum'; // Default to ethereum
}

/**
 * Get display name for a chain ID
 * @param chainId - EVM chain ID
 * @returns Human-readable network name
 */
export function getNetworkDisplayName(chainId: number): string {
  const nameMap: Record<number, string> = {
    1: 'Ethereum',
    5000: 'Mantle',
    137: 'Polygon',
    56: 'BSC',
    42161: 'Arbitrum',
    10: 'Optimism',
    43114: 'Avalanche',
    250: 'Fantom',
    5003: 'Mantle Sepolia',
    11155111: 'Sepolia',
    80001: 'Mumbai',
    97: 'BSC Testnet',
  };
  return nameMap[chainId] || `Chain ${chainId}`;
}

/**
 * Get the default network for a cryptocurrency
 * Used when user doesn't specify which network to deposit from
 * @param coin - Coin symbol (e.g., 'ETH', 'BTC', 'USDC')
 * @returns Default network identifier for SideShift
 */
export function getDefaultNetworkForCoin(coin: string): string {
  const networkMap: Record<string, string> = {
    // Native coins - use their native network
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
    MATIC: 'polygon',
    BNB: 'bsc',
    AVAX: 'avalanche',
    TRX: 'tron',
    LTC: 'litecoin',
    DOGE: 'dogecoin',
    XRP: 'ripple',
    ADA: 'cardano',
    DOT: 'polkadot',
    ATOM: 'cosmos',
    // Stablecoins - default to Ethereum (most liquidity)
    USDC: 'ethereum',
    USDT: 'ethereum',
    DAI: 'ethereum',
    // Default for unknown coins
  };
  return networkMap[coin.toUpperCase()] || 'ethereum';
}

/**
 * List of testnet chain IDs
 */
const TESTNET_CHAIN_IDS = [
  5003,     // Mantle Sepolia
  11155111, // Ethereum Sepolia
  80001,    // Polygon Mumbai
  97,       // BSC Testnet
  421614,   // Arbitrum Sepolia
  11155420, // Optimism Sepolia
  43113,    // Avalanche Fuji
] as const;

/**
 * Check if a chain is a testnet
 * @param chainId - EVM chain ID
 * @returns True if the chain is a testnet
 */
export function isTestnet(chainId: number): boolean {
  return TESTNET_CHAIN_IDS.includes(chainId as any);
}

/**
 * List of native tokens that don't have contract addresses
 * These are the blockchain's native currency
 */
const NATIVE_TOKENS = [
  'ETH',   // Ethereum, Base, Arbitrum, Optimism
  'BNB',   // BSC
  'MATIC', // Polygon
  'AVAX',  // Avalanche
  'BTC',   // Bitcoin (non-EVM)
  'SOL',   // Solana (non-EVM)
] as const;

/**
 * Check if a currency is a native token
 * Native tokens don't have contract addresses (they're the blockchain's currency)
 * @param coin - Coin symbol (e.g., 'ETH', 'USDC', 'BTC')
 * @returns True if the coin is a native token
 */
export function isNativeToken(coin: string): boolean {
  return NATIVE_TOKENS.includes(coin.toUpperCase() as any);
}

/**
 * Get token contract details from SideShift API assets data
 * @param assets - Array of supported assets from useSupportedAssets()
 * @param coin - Coin symbol (e.g., 'USDC', 'USDT')
 * @param network - Network identifier (e.g., 'base', 'ethereum', 'bsc')
 * @returns Contract address and decimals, or null if not found
 */
export function getTokenContract(
  assets: Array<{
    coin: string;
    tokenDetails?: {
      [network: string]: {
        contractAddress: string;
        decimals: number;
      };
    };
  }>,
  coin: string,
  network: string
): { contractAddress: string; decimals: number } | null {
  // Native tokens don't have contract addresses
  if (isNativeToken(coin)) {
    return null;
  }

  // Find the asset
  const asset = assets.find(a => a.coin.toLowerCase() === coin.toLowerCase());

  if (!asset?.tokenDetails) {
    return null;
  }

  // Get token details for the specific network
  const tokenDetail = asset.tokenDetails[network.toLowerCase()];
  return tokenDetail || null;
}
