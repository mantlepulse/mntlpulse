/**
 * Feedbacks Contract Integration
 * Provides hooks and utilities for interacting with the Feedbacks smart contract
 */

import { Address, keccak256, toBytes } from 'viem';
import { useChainId, useReadContract, useWriteContract } from 'wagmi';
import FeedbacksContractArtifact from './Feedbacks.abi.json';
import { SUPPORTED_CHAINS, getContractAddress } from './contract-config';

export const FEEDBACKS_CONTRACT_ABI = FeedbacksContractArtifact.abi as const;

// Contract addresses by chain ID
export const FEEDBACKS_CONTRACT_ADDRESSES: Record<number, Address> = Object.fromEntries(
  SUPPORTED_CHAINS.map((chainId) => [
    chainId,
    getContractAddress(chainId, 'FEEDBACKS_CONTRACT') as Address,
  ])
) as Record<number, Address>;

// Enum mappings matching the Solidity contract
export enum FeedbackCategoryContract {
  FeatureRequest = 0,
  BugReport = 1,
  UiUx = 2,
  General = 3,
}

export enum FeedbackStatusContract {
  Open = 0,
  Selected = 1,
  Polled = 2,
  Closed = 3,
}

// Convert API category to contract enum
export const categoryToContract = (category: string): FeedbackCategoryContract => {
  switch (category) {
    case 'feature_request':
      return FeedbackCategoryContract.FeatureRequest;
    case 'bug_report':
      return FeedbackCategoryContract.BugReport;
    case 'ui_ux':
      return FeedbackCategoryContract.UiUx;
    case 'general':
    default:
      return FeedbackCategoryContract.General;
  }
};

// Convert API status to contract enum
export const statusToContract = (status: string): FeedbackStatusContract => {
  switch (status) {
    case 'open':
      return FeedbackStatusContract.Open;
    case 'selected':
      return FeedbackStatusContract.Selected;
    case 'polled':
      return FeedbackStatusContract.Polled;
    case 'closed':
    default:
      return FeedbackStatusContract.Closed;
  }
};

// Utility to convert UUID to bytes32
export const uuidToBytes32 = (uuid: string): `0x${string}` => {
  return keccak256(toBytes(uuid));
};

// Utility to hash content
export const hashContent = (content: string): `0x${string}` => {
  return keccak256(toBytes(content));
};

// Hook to get feedbacks contract address for current chain
export function useFeedbacksContractAddress() {
  const chainId = useChainId();
  return FEEDBACKS_CONTRACT_ADDRESSES[chainId];
}

// Hook to check if a feedback exists on-chain
export function useFeedbackExists(feedbackId?: `0x${string}`) {
  const chainId = useChainId();
  const contractAddress = FEEDBACKS_CONTRACT_ADDRESSES[chainId];

  return useReadContract({
    address: contractAddress,
    abi: FEEDBACKS_CONTRACT_ABI,
    functionName: 'feedbackExists',
    args: feedbackId ? [feedbackId] : undefined,
    query: {
      enabled: !!feedbackId && !!contractAddress,
    },
  });
}

// Hook to get feedback details from chain
export function useFeedbackOnChain(feedbackId?: `0x${string}`) {
  const chainId = useChainId();
  const contractAddress = FEEDBACKS_CONTRACT_ADDRESSES[chainId];

  return useReadContract({
    address: contractAddress,
    abi: FEEDBACKS_CONTRACT_ABI,
    functionName: 'getFeedback',
    args: feedbackId ? [feedbackId] : undefined,
    query: {
      enabled: !!feedbackId && !!contractAddress,
    },
  });
}

// Hook to get total feedbacks count
export function useTotalFeedbacks() {
  const chainId = useChainId();
  const contractAddress = FEEDBACKS_CONTRACT_ADDRESSES[chainId];

  return useReadContract({
    address: contractAddress,
    abi: FEEDBACKS_CONTRACT_ABI,
    functionName: 'getTotalFeedbacks',
    query: {
      enabled: !!contractAddress,
    },
  });
}

// Hook to get open feedbacks from chain
export function useOpenFeedbacksOnChain() {
  const chainId = useChainId();
  const contractAddress = FEEDBACKS_CONTRACT_ADDRESSES[chainId];

  return useReadContract({
    address: contractAddress,
    abi: FEEDBACKS_CONTRACT_ABI,
    functionName: 'getOpenFeedbacks',
    query: {
      enabled: !!contractAddress,
    },
  });
}

// Hook to get snapshot count
export function useSnapshotCount() {
  const chainId = useChainId();
  const contractAddress = FEEDBACKS_CONTRACT_ADDRESSES[chainId];

  return useReadContract({
    address: contractAddress,
    abi: FEEDBACKS_CONTRACT_ABI,
    functionName: 'snapshotCount',
    query: {
      enabled: !!contractAddress,
    },
  });
}

// Hook to snapshot feedbacks (owner only)
export function useSnapshotFeedbacks() {
  const chainId = useChainId();
  const contractAddress = FEEDBACKS_CONTRACT_ADDRESSES[chainId];

  return useWriteContract();
}

// Prepare snapshot data from API feedbacks
export interface FeedbackForSnapshot {
  id: string;
  category: string;
  content: string;
  status: string;
}

export interface PreparedSnapshotData {
  feedbackIds: `0x${string}`[];
  categories: number[];
  contentHashes: `0x${string}`[];
  statuses: number[];
}

export function prepareSnapshotData(feedbacks: FeedbackForSnapshot[]): PreparedSnapshotData {
  const feedbackIds: `0x${string}`[] = [];
  const categories: number[] = [];
  const contentHashes: `0x${string}`[] = [];
  const statuses: number[] = [];

  for (const feedback of feedbacks) {
    feedbackIds.push(uuidToBytes32(feedback.id));
    categories.push(categoryToContract(feedback.category));
    contentHashes.push(hashContent(feedback.content));
    statuses.push(statusToContract(feedback.status));
  }

  return { feedbackIds, categories, contentHashes, statuses };
}
