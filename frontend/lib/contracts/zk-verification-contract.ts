/**
 * ZK Verification Contract Configuration
 * Multi-provider ZK identity verification contract
 * Supports: Reclaim Protocol, Polygon ID, zkPass, World ID
 */

import { Address } from 'viem'
import { SUPPORTED_CHAINS, getContractAddress } from './contract-config'

// Social type enum (must match contract)
export enum SocialType {
  TWITTER = 0,
  DISCORD = 1,
  GITHUB = 2,
  TELEGRAM = 3,
}

// ZK Provider enum (must match contract)
export enum ZKProvider {
  RECLAIM = 0,
  POLYGON_ID = 1,
  ZKPASS = 2,
  WORLD_ID = 3,
}

// Social type display names
export const SOCIAL_TYPE_NAMES: Record<SocialType, string> = {
  [SocialType.TWITTER]: 'Twitter/X',
  [SocialType.DISCORD]: 'Discord',
  [SocialType.GITHUB]: 'GitHub',
  [SocialType.TELEGRAM]: 'Telegram',
}

// ZK Provider display names
export const ZK_PROVIDER_NAMES: Record<ZKProvider, string> = {
  [ZKProvider.RECLAIM]: 'Reclaim Protocol',
  [ZKProvider.POLYGON_ID]: 'Polygon ID',
  [ZKProvider.ZKPASS]: 'zkPass',
  [ZKProvider.WORLD_ID]: 'World ID',
}

// Simple verification status interface (any provider)
export interface ZKVerificationStatus {
  twitter: boolean
  discord: boolean
  github: boolean
  telegram: boolean
  count: number
}

// Verification status per provider
export interface ProviderVerificationStatus {
  twitter: boolean
  discord: boolean
  github: boolean
  telegram: boolean
  count: number
}

// Detailed verification status with per-provider breakdown
export interface DetailedZKVerificationStatus extends ZKVerificationStatus {
  byProvider: Record<ZKProvider, ProviderVerificationStatus>
}

// Contract addresses by chain ID
export const ZK_VERIFICATION_CONTRACT_ADDRESSES: Record<number, Address> = Object.fromEntries(
  SUPPORTED_CHAINS.map(chainId => [
    chainId,
    getContractAddress(chainId, 'ZK_VERIFICATION_CONTRACT') as Address
  ])
) as Record<number, Address>

// Contract function names
export const ZK_VERIFICATION_FUNCTIONS = {
  // Read functions - Simple (any provider)
  IS_VERIFIED: 'isVerified',
  GET_VERIFICATION_COUNT: 'getVerificationCount',
  GET_VOTING_WEIGHT: 'getVotingWeight',
  GET_VERIFICATION_STATUS: 'getVerificationStatus',
  IS_NULLIFIER_USED: 'isNullifierUsed',
  CAN_ACCESS_ZK_FEATURES: 'canAccessZKFeatures',
  VERIFICATION_ENABLED: 'verificationEnabled',
  TOTAL_VERIFICATIONS: 'totalVerifications',

  // Read functions - Provider-specific
  IS_VERIFIED_WITH_PROVIDER: 'isVerifiedWithProvider',
  GET_VERIFICATION_COUNT_BY_PROVIDER: 'getVerificationCountByProvider',
  GET_DETAILED_VERIFICATION_STATUS: 'getDetailedVerificationStatus',
  GET_PROVIDERS_FOR_SOCIAL_TYPE: 'getProvidersForSocialType',
  MEETS_REQUIREMENTS: 'meetsRequirements',
  IS_PROVIDER_ENABLED: 'isProviderEnabled',

  // Write functions
  VERIFY_SOCIAL_ACCOUNT: 'verifySocialAccount',
  VERIFY_SOCIAL_ACCOUNT_WITH_PROVIDER: 'verifySocialAccountWithProvider',
  REVOKE_VERIFICATION: 'revokeVerification',
  REVOKE_VERIFICATION_WITH_PROVIDER: 'revokeVerificationWithProvider',

  // Admin functions
  SET_PREMIUM_CONTRACT: 'setPremiumContract',
  SET_VERIFICATION_ENABLED: 'setVerificationEnabled',
  SET_PROVIDER_ENABLED: 'setProviderEnabled',
} as const

// Event names
export const ZK_VERIFICATION_EVENTS = {
  SOCIAL_VERIFIED: 'SocialVerified',
  SOCIAL_VERIFIED_WITH_PROVIDER: 'SocialVerifiedWithProvider',
  VERIFICATION_REVOKED: 'VerificationRevoked',
  VERIFICATION_REVOKED_WITH_PROVIDER: 'VerificationRevokedWithProvider',
  PREMIUM_CONTRACT_UPDATED: 'PremiumContractUpdated',
  PROVIDER_STATUS_CHANGED: 'ProviderStatusChanged',
} as const

// Multi-provider ABI for ZK Verification contract
export const ZK_VERIFICATION_ABI = [
  // ============ Read functions - Simple (any provider) ============
  {
    name: 'isVerified',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'socialType', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getVerificationCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getVotingWeight',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getVerificationStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'twitter', type: 'bool' },
      { name: 'discord', type: 'bool' },
      { name: 'github', type: 'bool' },
      { name: 'telegram', type: 'bool' },
      { name: 'count', type: 'uint256' },
    ],
  },
  {
    name: 'isNullifierUsed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'nullifier', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'canAccessZKFeatures',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'verificationEnabled',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'totalVerifications',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // ============ Read functions - Provider-specific ============
  {
    name: 'isVerifiedWithProvider',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'provider', type: 'uint8' },
      { name: 'socialType', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getVerificationCountByProvider',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'provider', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getDetailedVerificationStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getProvidersForSocialType',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'socialType', type: 'uint8' },
    ],
    outputs: [{ name: 'providers', type: 'bool[4]' }],
  },
  {
    name: 'meetsRequirements',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'requiredProviders', type: 'uint8' },
      { name: 'requiredSocialTypes', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isProviderEnabled',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'provider', type: 'uint8' }],
    outputs: [{ name: '', type: 'bool' }],
  },

  // ============ Write functions ============
  {
    name: 'verifySocialAccount',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'zkProof', type: 'bytes' },
      { name: 'socialType', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'verifySocialAccountWithProvider',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'zkProof', type: 'bytes' },
      { name: 'provider', type: 'uint8' },
      { name: 'socialType', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'revokeVerification',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'socialType', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'revokeVerificationWithProvider',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'provider', type: 'uint8' },
      { name: 'socialType', type: 'uint8' },
    ],
    outputs: [],
  },

  // ============ Admin functions ============
  {
    name: 'setPremiumContract',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_premiumContract', type: 'address' }],
    outputs: [],
  },
  {
    name: 'setVerificationEnabled',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'enabled', type: 'bool' }],
    outputs: [],
  },
  {
    name: 'setProviderEnabled',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'provider', type: 'uint8' },
      { name: 'enabled', type: 'bool' },
    ],
    outputs: [],
  },

  // ============ Events ============
  {
    name: 'SocialVerified',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'socialType', type: 'uint8', indexed: true },
      { name: 'nullifier', type: 'bytes32', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'SocialVerifiedWithProvider',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'provider', type: 'uint8', indexed: true },
      { name: 'socialType', type: 'uint8', indexed: true },
      { name: 'nullifier', type: 'bytes32', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'VerificationRevoked',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'socialType', type: 'uint8', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'VerificationRevokedWithProvider',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'provider', type: 'uint8', indexed: true },
      { name: 'socialType', type: 'uint8', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'PremiumContractUpdated',
    type: 'event',
    inputs: [
      { name: 'oldContract', type: 'address', indexed: true },
      { name: 'newContract', type: 'address', indexed: true },
    ],
  },
  {
    name: 'ProviderStatusChanged',
    type: 'event',
    inputs: [
      { name: 'provider', type: 'uint8', indexed: true },
      { name: 'enabled', type: 'bool', indexed: false },
    ],
  },
] as const

// Helper to convert provider enum to bitmask
export function providerToBitmask(provider: ZKProvider): number {
  return 1 << provider
}

// Helper to convert social type enum to bitmask
export function socialTypeToBitmask(socialType: SocialType): number {
  return 1 << socialType
}

// Helper to convert array of providers to bitmask
export function providersToBitmask(providers: ZKProvider[]): number {
  return providers.reduce((mask, p) => mask | providerToBitmask(p), 0)
}

// Helper to convert array of social types to bitmask
export function socialTypesToBitmask(types: SocialType[]): number {
  return types.reduce((mask, t) => mask | socialTypeToBitmask(t), 0)
}

// Helper to decode detailed status bitmask
export function decodeDetailedStatus(packedStatus: bigint): DetailedZKVerificationStatus {
  const result: DetailedZKVerificationStatus = {
    twitter: false,
    discord: false,
    github: false,
    telegram: false,
    count: 0,
    byProvider: {
      [ZKProvider.RECLAIM]: { twitter: false, discord: false, github: false, telegram: false, count: 0 },
      [ZKProvider.POLYGON_ID]: { twitter: false, discord: false, github: false, telegram: false, count: 0 },
      [ZKProvider.ZKPASS]: { twitter: false, discord: false, github: false, telegram: false, count: 0 },
      [ZKProvider.WORLD_ID]: { twitter: false, discord: false, github: false, telegram: false, count: 0 },
    },
  }

  // Each provider uses 4 bits (one per social type)
  // Provider 0 (RECLAIM): bits 0-3
  // Provider 1 (POLYGON_ID): bits 4-7
  // Provider 2 (ZKPASS): bits 8-11
  // Provider 3 (WORLD_ID): bits 12-15
  for (let provider = 0; provider < 4; provider++) {
    const providerOffset = provider * 4
    for (let social = 0; social < 4; social++) {
      const bitPosition = providerOffset + social
      const isVerified = (packedStatus >> BigInt(bitPosition)) & BigInt(1)

      if (isVerified === BigInt(1)) {
        const providerKey = provider as ZKProvider
        const socialKeys = ['twitter', 'discord', 'github', 'telegram'] as const
        const socialKey = socialKeys[social]

        if (socialKey) {
          result.byProvider[providerKey][socialKey] = true
          result.byProvider[providerKey].count++

          // Update aggregate status
          result[socialKey] = true
        }
      }
    }
  }

  // Count unique social types verified
  result.count = [result.twitter, result.discord, result.github, result.telegram]
    .filter(Boolean).length

  return result
}
