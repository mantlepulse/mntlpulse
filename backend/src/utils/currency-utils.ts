/**
 * Currency Utility Functions
 * Helpers for working with cryptocurrencies
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
