/**
 * Smart contract configuration
 */

import { Address } from 'viem';
import { config } from './env';

// Network chain IDs
export const MANTLE_MAINNET_CHAIN_ID = 5000;
export const MANTLE_SEPOLIA_CHAIN_ID = 5003;

// RPC URLs for each network (with fallback defaults)
export const MANTLE_MAINNET_RPC = config.blockchain.mantleMainnetRpcUrl || 'https://rpc.mantle.xyz';
export const MANTLE_SEPOLIA_RPC = config.blockchain.mantleSepoliaRpcUrl || 'https://rpc.sepolia.mantle.xyz';

// Contract addresses for each network (from environment variables)
const MANTLE_MAINNET_POLLS_CONTRACT: Address = config.blockchain.mantleMainnetPollsContract as Address;
const MANTLE_SEPOLIA_POLLS_CONTRACT: Address = config.blockchain.mantleSepoliaPollsContract as Address;

// Staking contract addresses (set when deployed)
const MANTLE_MAINNET_STAKING_CONTRACT: Address = (config.blockchain.mantleMainnetStakingContract || '0x0000000000000000000000000000000000000000') as Address;
const MANTLE_SEPOLIA_STAKING_CONTRACT: Address = (config.blockchain.mantleSepoliaStakingContract || '0x0000000000000000000000000000000000000000') as Address;

// Premium subscription contract addresses (set when deployed)
const MANTLE_MAINNET_PREMIUM_CONTRACT: Address = (config.blockchain.mantleMainnetPremiumContract || '0x0000000000000000000000000000000000000000') as Address;
const MANTLE_SEPOLIA_PREMIUM_CONTRACT: Address = (config.blockchain.mantleSepoliaPremiumContract || '0x0000000000000000000000000000000000000000') as Address;

// Environment-based configuration
const isProduction = process.env.NODE_ENV === 'production';

// Export active configuration based on environment
export const CHAIN_ID = isProduction ? MANTLE_MAINNET_CHAIN_ID : MANTLE_SEPOLIA_CHAIN_ID;
export const POLLS_CONTRACT_ADDRESS: Address = isProduction
  ? MANTLE_MAINNET_POLLS_CONTRACT
  : MANTLE_SEPOLIA_POLLS_CONTRACT;
export const STAKING_CONTRACT_ADDRESS: Address = isProduction
  ? MANTLE_MAINNET_STAKING_CONTRACT
  : MANTLE_SEPOLIA_STAKING_CONTRACT;
export const PREMIUM_CONTRACT_ADDRESS: Address = isProduction
  ? MANTLE_MAINNET_PREMIUM_CONTRACT
  : MANTLE_SEPOLIA_PREMIUM_CONTRACT;
export const RPC_URL = isProduction ? MANTLE_MAINNET_RPC : MANTLE_SEPOLIA_RPC;

// Helper to get config for a specific network
export const getNetworkConfig = (chainId: number) => {
  if (chainId === MANTLE_MAINNET_CHAIN_ID) {
    return {
      chainId: MANTLE_MAINNET_CHAIN_ID,
      pollsContract: MANTLE_MAINNET_POLLS_CONTRACT,
      rpcUrl: MANTLE_MAINNET_RPC,
      network: 'Mantle Mainnet',
    };
  } else if (chainId === MANTLE_SEPOLIA_CHAIN_ID) {
    return {
      chainId: MANTLE_SEPOLIA_CHAIN_ID,
      pollsContract: MANTLE_SEPOLIA_POLLS_CONTRACT,
      rpcUrl: MANTLE_SEPOLIA_RPC,
      network: 'Mantle Sepolia',
    };
  }
  throw new Error(`Unsupported chain ID: ${chainId}`);
};

// Contract ABI - Optimized contract (deployed 2025-01-10)
export const POLLS_CONTRACT_ABI = [
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { indexed: false, internalType: 'enum PollsContract.DistributionMode', name: 'mode', type: 'uint8' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'DistributionModeSet',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'recipient', type: 'address' },
      { indexed: false, internalType: 'address', name: 'token', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'FundsWithdrawn',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: false, internalType: 'string', name: 'question', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'endTime', type: 'uint256' },
    ],
    name: 'PollCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'funder', type: 'address' },
      { indexed: false, internalType: 'address', name: 'token', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'PollFunded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'claimer', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'address', name: 'token', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'RewardClaimed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'recipient', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'address', name: 'token', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'RewardDistributed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'voter', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'optionIndex', type: 'uint256' },
    ],
    name: 'Voted',
    type: 'event',
  },
  // Functions
  {
    inputs: [
      { internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'address[]', name: 'tokens', type: 'address[]' },
    ],
    name: 'withdrawFunds',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address[]', name: 'recipients', type: 'address[]' },
      { internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' },
    ],
    name: 'distributeRewards',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'pollId', type: 'uint256' }],
    name: 'getPoll',
    outputs: [
      { internalType: 'uint256', name: 'id', type: 'uint256' },
      { internalType: 'string', name: 'question', type: 'string' },
      { internalType: 'string[]', name: 'options', type: 'string[]' },
      { internalType: 'uint256[]', name: 'votes', type: 'uint256[]' },
      { internalType: 'uint256', name: 'endTime', type: 'uint256' },
      { internalType: 'bool', name: 'isActive', type: 'bool' },
      { internalType: 'address', name: 'creator', type: 'address' },
      { internalType: 'uint256', name: 'totalFunding', type: 'uint256' },
      { internalType: 'enum PollsContract.DistributionMode', name: 'distributionMode', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { internalType: 'address', name: 'token', type: 'address' },
    ],
    name: 'getPollTokenBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'pollId', type: 'uint256' }],
    name: 'fundPollWithETH',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'fundPollWithToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { internalType: 'uint256', name: 'optionIndex', type: 'uint256' },
    ],
    name: 'vote',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'pollId', type: 'uint256' }],
    name: 'getActivePolls',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'pollId', type: 'uint256' }],
    name: 'isPollActive',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'hasUserVoted',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // VotesBought event for quadratic voting
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'voter', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'optionIndex', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'numVotes', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'cost', type: 'uint256' },
    ],
    name: 'VotesBought',
    type: 'event',
  },
] as const;

// Staking Contract ABI
export const STAKING_CONTRACT_ABI = [
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'Staked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'Unstaked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'RewardsClaimed',
    type: 'event',
  },
  // View functions
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'isPremiumByStaking',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalStaked',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Premium Subscription Contract ABI
export const PREMIUM_CONTRACT_ABI = [
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint8', name: 'tier', type: 'uint8' },
      { indexed: false, internalType: 'uint256', name: 'expirationTime', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'price', type: 'uint256' },
    ],
    name: 'SubscriptionPurchased',
    type: 'event',
  },
  // View functions
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'isPremium',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'isPremiumOrStaked',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
