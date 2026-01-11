import { Address } from 'viem'
import StakingContractArtifact from './StakingContract.abi.json'
import { CONTRACT_ADDRESSES, SUPPORTED_CHAINS, getContractAddress } from './contract-config'

export const STAKING_CONTRACT_ABI = StakingContractArtifact.abi as const

// Contract addresses by chain ID
export const STAKING_CONTRACT_ADDRESSES: Record<number, Address> = Object.fromEntries(
  SUPPORTED_CHAINS.map(chainId => [
    chainId,
    getContractAddress(chainId, 'STAKING_CONTRACT') as Address
  ])
) as Record<number, Address>

// Contract function names for type safety
export const STAKING_FUNCTIONS = {
  // Read functions
  GET_STAKE_INFO: 'getStakeInfo',
  IS_PREMIUM_BY_STAKING: 'isPremiumByStaking',
  CALCULATE_PENDING_REWARDS: 'calculatePendingRewards',
  GET_TOTAL_CLAIMABLE_REWARDS: 'getTotalClaimableRewards',
  TOTAL_STAKED: 'totalStaked',
  MINIMUM_STAKE_FOR_PREMIUM: 'minimumStakeForPremium',
  REWARD_RATE_PER_SECOND: 'rewardRatePerSecond',
  REWARD_POOL: 'rewardPool',
  PULSE_TOKEN: 'pulseToken',

  // Write functions
  STAKE: 'stake',
  UNSTAKE: 'unstake',
  CLAIM_REWARDS: 'claimRewards',
  FUND_REWARD_POOL: 'fundRewardPool',
} as const

// Event names
export const STAKING_EVENTS = {
  STAKED: 'Staked',
  UNSTAKED: 'Unstaked',
  REWARDS_CLAIMED: 'RewardsClaimed',
  REWARD_POOL_FUNDED: 'RewardPoolFunded',
  MINIMUM_STAKE_UPDATED: 'MinimumStakeUpdated',
  REWARD_RATE_UPDATED: 'RewardRateUpdated',
} as const

// Types
export interface StakeInfo {
  amount: bigint
  stakingStartTime: bigint
  lastRewardClaim: bigint
  accumulatedRewards: bigint
  pendingRewards: bigint
}

// Default minimum stake for premium (10,000 PULSE with 18 decimals)
export const DEFAULT_MINIMUM_STAKE = 10000n * 10n ** 18n
