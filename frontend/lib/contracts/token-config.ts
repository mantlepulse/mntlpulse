/**
 * ERC20 Token Configuration for MantlePulse
 *
 * Supports:
 * - PULSE (PulsePoll Token)
 * - USDC (Stablecoin)
 *
 * Display Modes:
 * - "crypto": Show actual token amounts
 * - "points": Convert to points for gamification
 * - "hidden": Hide rewards, focus on quests/participation
 */

import { Address } from 'viem';

// Display modes for poll rewards
export type RewardDisplayMode = 'crypto' | 'points' | 'hidden';

// Token metadata
export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  icon?: string;
  color?: string;
  isNative?: boolean; // true for MNT/ETH
}

// PULSE token addresses from environment variables (with fallbacks)
const PULSE_TOKEN_MANTLE_MAINNET = (process.env.NEXT_PUBLIC_PULSE_TOKEN_MANTLE || '0x0000000000000000000000000000000000000000') as Address;
const PULSE_TOKEN_MANTLE_SEPOLIA = (process.env.NEXT_PUBLIC_PULSE_TOKEN_MANTLE_SEPOLIA || '0xa3713739c39419aA1c6daf349dB4342Be59b9142') as Address;

// Whitelisted tokens by network (only tokens that can fund polls)
export const WHITELISTED_TOKENS = {
  // Mantle Mainnet (5000)
  5000: {
    PULSE: PULSE_TOKEN_MANTLE_MAINNET,
    USDC: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9' as Address,
  },
  // Mantle Sepolia (5003)
  5003: {
    PULSE: PULSE_TOKEN_MANTLE_SEPOLIA,
    USDC: '0x6763442EbDe3705C4AE49Ca926b001997C67cC51' as Address, // MockUSDC for testnet
  },
} as const;

// Token metadata for UI display
export const TOKEN_INFO: Record<string, TokenInfo> = {
  MNT: {
    symbol: 'MNT',
    name: 'Mantle',
    decimals: 18,
    icon: '/tokens/mnt.svg',
    color: '#000000',
    isNative: true,
  },
  PULSE: {
    symbol: 'PULSE',
    name: 'PulsePoll Token',
    decimals: 18,
    icon: '/tokens/pulse.svg',
    color: '#00D4FF',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    icon: '/tokens/usdc.svg',
    color: '#2775CA',
  },
};

// Get all supported tokens for a given chain
export const getSupportedTokens = (chainId: number): Record<string, Address> => {
  const tokens = WHITELISTED_TOKENS[chainId as keyof typeof WHITELISTED_TOKENS];
  return tokens || {};
};

// Get token info by symbol
export const getTokenInfo = (symbol: string): TokenInfo | undefined => {
  return TOKEN_INFO[symbol];
};

// Get token address by symbol and chain
export const getTokenAddress = (chainId: number, symbol: string): Address | undefined => {
  const tokens = getSupportedTokens(chainId);
  return tokens[symbol];
};

// Get token symbol by address and chain
export const getTokenSymbol = (chainId: number, address: Address): string | undefined => {
  const tokens = getSupportedTokens(chainId);
  const entry = Object.entries(tokens).find(([_, addr]) => addr.toLowerCase() === address.toLowerCase());
  return entry?.[0];
};

// Convert token amount to points
// Default: 1 PULSE = 1 Point, 1 USDC = 10 Points, 1 MNT = 100 Points
export const TOKEN_TO_POINTS_RATE: Record<string, number> = {
  PULSE: 1,
  USDC: 10,
  MNT: 100,
};

export const convertToPoints = (symbol: string, amount: number): number => {
  const rate = TOKEN_TO_POINTS_RATE[symbol] || 1;
  return Math.floor(amount * rate);
};

// Format token amount based on display mode
export interface FormatRewardOptions {
  mode: RewardDisplayMode;
  tokenSymbol: string;
  amount: number; // Raw amount with decimals
  decimals: number;
}

export const formatRewardAmount = (options: FormatRewardOptions): string => {
  const { mode, tokenSymbol, amount, decimals } = options;

  // Hidden mode
  if (mode === 'hidden') {
    return 'Reward Available';
  }

  // Format the amount (divide by 10^decimals to get actual value)
  const formattedAmount = amount / Math.pow(10, decimals);

  // Points mode
  if (mode === 'points') {
    const points = convertToPoints(tokenSymbol, formattedAmount);
    return `${points.toLocaleString()} Points`;
  }

  // Crypto mode (default)
  return `${formattedAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })} ${tokenSymbol}`;
};

// Get display mode from user preferences or default
export const getRewardDisplayMode = (): RewardDisplayMode => {
  // Check localStorage for user preference
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('rewardDisplayMode');
    if (stored && ['crypto', 'points', 'hidden'].includes(stored)) {
      return stored as RewardDisplayMode;
    }
  }
  // Default to crypto
  return 'crypto';
};

// Save display mode preference
export const setRewardDisplayMode = (mode: RewardDisplayMode): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('rewardDisplayMode', mode);
  }
};

// ERC20 Token ABI (minimal, for approve and balanceOf)
export const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
