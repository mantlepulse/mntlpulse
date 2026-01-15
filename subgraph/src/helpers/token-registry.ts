/**
 * Token Registry for MantlePulse Subgraph
 *
 * This file contains known token addresses for both Mantle Sepolia and Mainnet.
 * Update these addresses when deploying to different networks or adding new tokens.
 *
 * Note: The Graph subgraphs compile to WebAssembly, so we cannot use runtime
 * environment variables. Token addresses must be defined at build time.
 */

import { Address } from '@graphprotocol/graph-ts'

// ============================================================================
// TOKEN ADDRESSES - Update these when deploying to different networks
// ============================================================================

/**
 * PULSE Token Addresses
 * - Mantle Sepolia: 0xa3713739c39419aA1c6daf349dB4342Be59b9142
 * - Mantle Mainnet: TBD (update when deployed)
 */
export const PULSE_TOKEN_ADDRESSES: Address[] = [
  Address.fromString('0xa3713739c39419aA1c6daf349dB4342Be59b9142'), // Mantle Sepolia
  // Address.fromString('0x...'), // Mantle Mainnet - uncomment when deployed
]

/**
 * USDC Token Addresses
 * - Mantle Sepolia: 0x6763442EbDe3705C4AE49Ca926b001997C67cC51 (MockUSDC)
 * - Mantle Mainnet: 0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9
 */
export const USDC_TOKEN_ADDRESSES: Address[] = [
  Address.fromString('0x6763442EbDe3705C4AE49Ca926b001997C67cC51'), // Mantle Sepolia (MockUSDC)
  Address.fromString('0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9'), // Mantle Mainnet
]

// ============================================================================
// TOKEN INFO LOOKUP
// ============================================================================

/**
 * Known token information
 */
export class TokenInfo {
  symbol: string
  name: string
  decimals: i32

  constructor(symbol: string, name: string, decimals: i32) {
    this.symbol = symbol
    this.name = name
    this.decimals = decimals
  }
}

/**
 * Check if an address is in an array of addresses
 */
function isAddressInArray(address: Address, addresses: Address[]): boolean {
  for (let i = 0; i < addresses.length; i++) {
    if (address.equals(addresses[i])) {
      return true
    }
  }
  return false
}

/**
 * Get known token info for common tokens
 * Returns TokenInfo or null if unknown
 */
export function getKnownTokenInfo(address: Address): TokenInfo | null {
  // PULSE token
  if (isAddressInArray(address, PULSE_TOKEN_ADDRESSES)) {
    return new TokenInfo('PULSE', 'PulsePoll Token', 18)
  }

  // USDC token
  if (isAddressInArray(address, USDC_TOKEN_ADDRESSES)) {
    return new TokenInfo('USDC', 'USD Coin', 6)
  }

  return null
}
