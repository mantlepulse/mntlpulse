/**
 * Contract deployment addresses configuration
 * Update these addresses via environment variables after deploying contracts to each network
 */

// Debug: Log environment variables
console.log('=== CONTRACT CONFIG DEBUG ===')
console.log('NEXT_PUBLIC_POLLS_CONTRACT_MANTLE:', process.env.NEXT_PUBLIC_POLLS_CONTRACT_MANTLE)
console.log('NEXT_PUBLIC_POLLS_CONTRACT_MANTLE_SEPOLIA:', process.env.NEXT_PUBLIC_POLLS_CONTRACT_MANTLE_SEPOLIA)

// Hardcoded fallback addresses (update these when deploying to production)
const MANTLE_MAINNET_CONTRACT = '0x0000000000000000000000000000000000000000' as const // Deploy first
const MANTLE_SEPOLIA_CONTRACT = '0x0000000000000000000000000000000000000000' as const // Deploy first

// Staking and Premium Subscription contracts (to be deployed)
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

// PULSE token addresses (to be deployed on Mantle)
const MANTLE_MAINNET_PULSE_TOKEN = '0x0000000000000000000000000000000000000000' as const // Deploy first
const MANTLE_SEPOLIA_PULSE_TOKEN = '0x0000000000000000000000000000000000000000' as const // Deploy first

export const CONTRACT_ADDRESSES = {
  // Mantle Mainnet (chainId: 5000)
  5000: {
    POLLS_CONTRACT: (process.env.NEXT_PUBLIC_POLLS_CONTRACT_MANTLE || MANTLE_MAINNET_CONTRACT) as `0x${string}`,
    STAKING_CONTRACT: (process.env.NEXT_PUBLIC_STAKING_CONTRACT_MANTLE || ZERO_ADDRESS) as `0x${string}`,
    PREMIUM_CONTRACT: (process.env.NEXT_PUBLIC_PREMIUM_CONTRACT_MANTLE || ZERO_ADDRESS) as `0x${string}`,
    PULSE_TOKEN: (process.env.NEXT_PUBLIC_PULSE_TOKEN_MANTLE || MANTLE_MAINNET_PULSE_TOKEN) as `0x${string}`,
    ZK_VERIFICATION_CONTRACT: (process.env.NEXT_PUBLIC_ZK_VERIFICATION_CONTRACT_MANTLE || ZERO_ADDRESS) as `0x${string}`,
    FEEDBACKS_CONTRACT: (process.env.NEXT_PUBLIC_FEEDBACKS_CONTRACT_MANTLE || ZERO_ADDRESS) as `0x${string}`,
  },
  // Mantle Sepolia Testnet (chainId: 5003)
  5003: {
    POLLS_CONTRACT: (process.env.NEXT_PUBLIC_POLLS_CONTRACT_MANTLE_SEPOLIA || MANTLE_SEPOLIA_CONTRACT) as `0x${string}`,
    STAKING_CONTRACT: (process.env.NEXT_PUBLIC_STAKING_CONTRACT_MANTLE_SEPOLIA || ZERO_ADDRESS) as `0x${string}`,
    PREMIUM_CONTRACT: (process.env.NEXT_PUBLIC_PREMIUM_CONTRACT_MANTLE_SEPOLIA || ZERO_ADDRESS) as `0x${string}`,
    PULSE_TOKEN: (process.env.NEXT_PUBLIC_PULSE_TOKEN_MANTLE_SEPOLIA || MANTLE_SEPOLIA_PULSE_TOKEN) as `0x${string}`,
    ZK_VERIFICATION_CONTRACT: (process.env.NEXT_PUBLIC_ZK_VERIFICATION_CONTRACT_MANTLE_SEPOLIA || ZERO_ADDRESS) as `0x${string}`,
    FEEDBACKS_CONTRACT: (process.env.NEXT_PUBLIC_FEEDBACKS_CONTRACT_MANTLE_SEPOLIA || ZERO_ADDRESS) as `0x${string}`,
  },
} as const

console.log('CONTRACT_ADDRESSES:', CONTRACT_ADDRESSES)

export type SupportedChainId = keyof typeof CONTRACT_ADDRESSES

export const SUPPORTED_CHAINS = Object.keys(CONTRACT_ADDRESSES).map(Number) as SupportedChainId[]

// Helper function to get contract address for a chain
export const getContractAddress = (chainId: number, contract: 'POLLS_CONTRACT' | 'STAKING_CONTRACT' | 'PREMIUM_CONTRACT' | 'PULSE_TOKEN' | 'ZK_VERIFICATION_CONTRACT' | 'FEEDBACKS_CONTRACT') => {
  const addresses = CONTRACT_ADDRESSES[chainId as SupportedChainId]
  return addresses?.[contract]
}

// Environment-based configuration
export const getEnvironmentConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    isDevelopment,
    isProduction,
    // Use testnet in development, mainnet in production (can be overridden)
    defaultChainId: isDevelopment ? 5003 : 5000,
    // Enable mock data when contracts are not deployed
    useMockData: process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true',
  }
}
