import { Address } from 'viem'
import PremiumSubscriptionArtifact from './PremiumSubscription.abi.json'
import { SUPPORTED_CHAINS, getContractAddress } from './contract-config'

export const PREMIUM_CONTRACT_ABI = PremiumSubscriptionArtifact.abi as const

// Contract addresses by chain ID
export const PREMIUM_CONTRACT_ADDRESSES: Record<number, Address> = Object.fromEntries(
  SUPPORTED_CHAINS.map(chainId => [
    chainId,
    getContractAddress(chainId, 'PREMIUM_CONTRACT') as Address
  ])
) as Record<number, Address>

// Contract function names
export const PREMIUM_FUNCTIONS = {
  // Read functions
  IS_PREMIUM: 'isPremium',
  IS_PREMIUM_OR_STAKED: 'isPremiumOrStaked',
  GET_SUBSCRIPTION: 'getSubscription',
  GET_TIER_PRICE: 'getTierPrice',
  GET_TIER_DURATION: 'getTierDuration',
  GET_TIME_REMAINING: 'getTimeRemaining',
  TOTAL_REVENUE: 'totalRevenue',
  TOTAL_SUBSCRIBERS: 'totalSubscribers',
  TREASURY: 'treasury',

  // Write functions
  SUBSCRIBE: 'subscribe',
  EXTEND_SUBSCRIPTION: 'extendSubscription',
} as const

// Event names
export const PREMIUM_EVENTS = {
  SUBSCRIPTION_PURCHASED: 'SubscriptionPurchased',
  SUBSCRIPTION_EXTENDED: 'SubscriptionExtended',
  TIER_PRICE_UPDATED: 'TierPriceUpdated',
} as const

// Subscription tier enum (must match contract)
export enum SubscriptionTier {
  NONE = 0,
  MONTHLY = 1,
  ANNUAL = 2,
  LIFETIME = 3,
}

// Types
export interface Subscription {
  tier: SubscriptionTier
  expirationTime: bigint
  isActive: boolean
  purchaseTime: bigint
  totalPaid: bigint
}

// Tier display names
export const TIER_NAMES: Record<SubscriptionTier, string> = {
  [SubscriptionTier.NONE]: 'None',
  [SubscriptionTier.MONTHLY]: 'Monthly',
  [SubscriptionTier.ANNUAL]: 'Annual',
  [SubscriptionTier.LIFETIME]: 'Lifetime',
}

// Default tier prices (in PULSE with 18 decimals)
export const DEFAULT_TIER_PRICES = {
  [SubscriptionTier.MONTHLY]: 1000n * 10n ** 18n,   // 1,000 PULSE
  [SubscriptionTier.ANNUAL]: 10000n * 10n ** 18n,   // 10,000 PULSE
  [SubscriptionTier.LIFETIME]: 50000n * 10n ** 18n, // 50,000 PULSE
}

// Tier durations in seconds
export const TIER_DURATIONS = {
  [SubscriptionTier.MONTHLY]: 30 * 24 * 60 * 60,    // 30 days
  [SubscriptionTier.ANNUAL]: 365 * 24 * 60 * 60,    // 365 days
  [SubscriptionTier.LIFETIME]: 0,                    // Never expires
}
