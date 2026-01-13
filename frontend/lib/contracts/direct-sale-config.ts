/**
 * DirectTokenSale Contract Configuration
 *
 * This file contains the contract addresses and network configuration
 * for the DirectTokenSale contract across different networks.
 *
 * Environment Variables:
 * - NEXT_PUBLIC_DIRECT_SALE_MANTLE: DirectTokenSale contract address on Mantle Mainnet
 * - NEXT_PUBLIC_DIRECT_SALE_MANTLE_SEPOLIA: DirectTokenSale contract address on Mantle Sepolia
 */

// Hardcoded fallback addresses (update these when deploying to production)
const MANTLE_MAINNET_DIRECT_SALE = '0x0000000000000000000000000000000000000000' as const // Deploy first
const MANTLE_SEPOLIA_DIRECT_SALE = '0xA6C63C79F9A9B841e4357736cE746564A9b7F70f' as const // DirectTokenSaleUpgradeable proxy

export const DIRECT_SALE_ADDRESSES = {
  // Mantle Mainnet (chainId: 5000)
  5000: (process.env.NEXT_PUBLIC_DIRECT_SALE_MANTLE || MANTLE_MAINNET_DIRECT_SALE) as `0x${string}`,
  // Mantle Sepolia Testnet (chainId: 5003)
  5003: (process.env.NEXT_PUBLIC_DIRECT_SALE_MANTLE_SEPOLIA || MANTLE_SEPOLIA_DIRECT_SALE) as `0x${string}`,
} as const;

export const USDC_ADDRESSES = {
  // Mantle Sepolia (testnet) - MockUSDC for testing
  5003: "0x6763442EbDe3705C4AE49Ca926b001997C67cC51",
  // Mantle Mainnet
  5000: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
} as const;

export type SupportedChainId = keyof typeof DIRECT_SALE_ADDRESSES;

/**
 * Get DirectTokenSale contract address for a specific chain
 * Supports environment variable override for easy deployment updates
 */
export function getDirectSaleAddress(chainId: number): `0x${string}` {
  const address = DIRECT_SALE_ADDRESSES[chainId as SupportedChainId];
  return address || "0x0000000000000000000000000000000000000000";
}

export function getUSDCAddress(chainId: number): string {
  const address = USDC_ADDRESSES[chainId as SupportedChainId];
  return address || "0x0000000000000000000000000000000000000000";
}

export const PULSE_TOKEN_ADDRESSES = {
  // Mantle Sepolia (testnet)
  5003: "0xa3713739c39419aA1c6daf349dB4342Be59b9142",
  // Mantle Mainnet - deploy first
  5000: "0x0000000000000000000000000000000000000000",
} as const;

export function getPulseTokenAddress(chainId: number): string {
  const address = PULSE_TOKEN_ADDRESSES[chainId as SupportedChainId];
  return address || "0x0000000000000000000000000000000000000000";
}

export const DIRECT_SALE_CONFIG = {
  tokenPrice: "0.01", // USDC per PULSE
  totalSupply: "1,000,000", // PULSE tokens
  minPurchase: "100", // PULSE tokens
  maxPurchasePerWallet: "50,000", // PULSE tokens
} as const;
