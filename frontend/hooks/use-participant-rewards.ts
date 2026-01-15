/**
 * Hook to fetch participant rewards from subgraph and contract
 * Provides claimable rewards, claim history, and participant stats
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery } from '@apollo/client/react'
import { useChainId, useAccount, useReadContracts } from 'wagmi'
import { formatEther, formatUnits, Address } from 'viem'
import { apolloClient, createApolloClient } from '@/lib/graphql/apollo-client'
import { GET_POLLS_VOTED_BY_USER, GET_USER_CLAIMS } from '@/lib/graphql/queries/polls'
import {
  POLLS_CONTRACT_ABI,
  POLLS_CONTRACT_ADDRESSES,
  CONTRACT_FUNCTIONS,
  SupportedChainId,
} from '@/lib/contracts/polls-contract'

interface VotedPoll {
  id: string
  pollId: string
  question: string
  options: string[]
  votes: string[]
  endTime: string
  isActive: boolean
  creator: {
    id: string
  }
  totalFunding: string
  totalFundingAmount: string
  fundingToken: {
    id: string
    symbol: string
    decimals: number
  } | null
  voteCount: string
  voterCount: string
  distributionMode: string
  fundingType: string
  status: 'ACTIVE' | 'CLOSED' | 'FOR_CLAIMING' | 'PAUSED'
  createdAt: string
  votingType: string
}

interface VoteEntry {
  id: string
  poll: VotedPoll
  optionIndex: string
  timestamp: string
  transactionHash: string
}

interface ClaimEntry {
  id: string
  poll: {
    id: string
    pollId: string
    question: string
  }
  recipient: {
    id: string
  }
  token: {
    id: string
    symbol: string
    decimals: number
  }
  amount: string
  eventType: string
  timestamp: string
  transactionHash: string
}

export interface ClaimableReward {
  id: bigint
  question: string
  isActive: boolean
  endTime: bigint
  totalFunding: bigint
  claimableAmount: string
  totalParticipants: number
  tokenSymbol: string
  tokenDecimals: number
  hasClaimed: boolean
  status: string
}

export interface ClaimHistoryItem {
  id: string
  pollId: bigint
  pollQuestion: string
  amount: string
  tokenSymbol: string
  status: 'completed' | 'processing' | 'failed'
  timestamp: Date
  txHash: string
}

export interface ParticipantStats {
  totalClaimable: string
  pollsParticipated: number
  totalClaimed: string
  pendingClaims: number
}

export function useParticipantRewards() {
  const chainId = useChainId()
  const { address } = useAccount()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Get Apollo client for current chain
  const client = useMemo(() => {
    return createApolloClient(chainId)
  }, [chainId])

  // Format address for subgraph query (lowercase bytes)
  const userAddressBytes = address?.toLowerCase() || ''

  // Fetch votes by user from subgraph
  const {
    data: votesData,
    loading: votesLoading,
    error: votesError,
    refetch: refetchVotes,
  } = useQuery<{ votes: VoteEntry[] }>(GET_POLLS_VOTED_BY_USER, {
    client,
    variables: { user: userAddressBytes, first: 100 },
    fetchPolicy: 'cache-and-network',
    skip: !address || !isClient,
  })

  // Fetch claim history from subgraph
  const {
    data: claimsData,
    loading: claimsLoading,
    error: claimsError,
    refetch: refetchClaims,
  } = useQuery<{ distributions: ClaimEntry[] }>(GET_USER_CLAIMS, {
    client,
    variables: { user: userAddressBytes, first: 100 },
    fetchPolicy: 'cache-and-network',
    skip: !address || !isClient,
  })

  // Extract unique polls that are claimable (status = FOR_CLAIMING or CLOSED with funding)
  const claimablePolls = useMemo(() => {
    if (!votesData?.votes) return []

    const pollMap = new Map<string, VotedPoll>()

    for (const vote of votesData.votes) {
      const poll = vote.poll
      // Only include polls that are FOR_CLAIMING or CLOSED with funding
      if (
        (poll.status === 'FOR_CLAIMING' || poll.status === 'CLOSED') &&
        BigInt(poll.totalFundingAmount || '0') > 0n
      ) {
        // Use pollId as key to deduplicate
        if (!pollMap.has(poll.pollId)) {
          pollMap.set(poll.pollId, poll)
        }
      }
    }

    return Array.from(pollMap.values())
  }, [votesData])

  // Get contract address for current chain
  const contractAddress = POLLS_CONTRACT_ADDRESSES[chainId as SupportedChainId]

  // Create contract read calls for claimable rewards
  const claimableRewardCalls = useMemo(() => {
    if (!contractAddress || !address || claimablePolls.length === 0) return []

    return claimablePolls.map((poll) => ({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.GET_CLAIMABLE_REWARD,
      args: [BigInt(poll.pollId), address as Address],
    }))
  }, [contractAddress, address, claimablePolls])

  // Create contract read calls for hasClaimed status
  const hasClaimedCalls = useMemo(() => {
    if (!contractAddress || !address || claimablePolls.length === 0) return []

    return claimablePolls.map((poll) => ({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.HAS_CLAIMED_REWARD,
      args: [BigInt(poll.pollId), address as Address],
    }))
  }, [contractAddress, address, claimablePolls])

  // Batch read claimable rewards from contract
  const {
    data: claimableRewardsData,
    isLoading: claimableLoading,
    refetch: refetchClaimableRewards,
  } = useReadContracts({
    contracts: claimableRewardCalls,
    query: {
      enabled: claimableRewardCalls.length > 0,
    },
  })

  // Batch read hasClaimed status from contract
  const {
    data: hasClaimedData,
    isLoading: hasClaimedLoading,
    refetch: refetchHasClaimed,
  } = useReadContracts({
    contracts: hasClaimedCalls,
    query: {
      enabled: hasClaimedCalls.length > 0,
    },
  })

  // Combine subgraph data with contract data
  const rewards = useMemo((): ClaimableReward[] => {
    if (!claimablePolls.length) return []

    return claimablePolls
      .map((poll, index) => {
        const claimableResult = claimableRewardsData?.[index]
        const hasClaimedResult = hasClaimedData?.[index]

        const claimableAmount = claimableResult?.result as bigint | undefined
        const hasClaimed = (hasClaimedResult?.result as boolean) ?? false

        // Skip if already claimed or no claimable amount
        if (hasClaimed || !claimableAmount || claimableAmount === 0n) {
          return null
        }

        const decimals = poll.fundingToken?.decimals ?? 18
        const symbol = poll.fundingToken?.symbol ?? 'PULSE'

        return {
          id: BigInt(poll.pollId),
          question: poll.question,
          isActive: poll.isActive,
          endTime: BigInt(poll.endTime),
          totalFunding: BigInt(poll.totalFundingAmount || '0'),
          claimableAmount: formatUnits(claimableAmount, decimals),
          totalParticipants: parseInt(poll.voterCount || '0'),
          tokenSymbol: symbol,
          tokenDecimals: decimals,
          hasClaimed,
          status: poll.status,
        }
      })
      .filter((reward): reward is ClaimableReward => reward !== null)
  }, [claimablePolls, claimableRewardsData, hasClaimedData])

  // Transform claim history
  const claimHistory = useMemo((): ClaimHistoryItem[] => {
    if (!claimsData?.distributions) return []

    return claimsData.distributions.map((claim) => ({
      id: claim.id,
      pollId: BigInt(claim.poll.pollId),
      pollQuestion: claim.poll.question,
      amount: formatUnits(BigInt(claim.amount), claim.token.decimals),
      tokenSymbol: claim.token.symbol,
      status: 'completed' as const,
      timestamp: new Date(parseInt(claim.timestamp) * 1000),
      txHash: claim.transactionHash,
    }))
  }, [claimsData])

  // Calculate participant stats
  const stats = useMemo((): ParticipantStats => {
    // Count unique polls participated
    const uniquePolls = new Set(votesData?.votes?.map((v) => v.poll.pollId) || [])
    const pollsParticipated = uniquePolls.size

    // Sum up claimable amounts
    const totalClaimableValue = rewards.reduce((sum, reward) => {
      return sum + parseFloat(reward.claimableAmount)
    }, 0)

    // Sum up claimed amounts
    const totalClaimedValue = claimHistory.reduce((sum, claim) => {
      return sum + parseFloat(claim.amount)
    }, 0)

    // Find the most common token symbol for display
    const primarySymbol = rewards.length > 0 ? rewards[0].tokenSymbol : 'PULSE'

    return {
      totalClaimable: `${totalClaimableValue.toFixed(2)} ${primarySymbol}`,
      pollsParticipated,
      totalClaimed: `${totalClaimedValue.toFixed(2)} ${primarySymbol}`,
      pendingClaims: rewards.length,
    }
  }, [rewards, claimHistory, votesData])

  // Refetch all data
  const refetch = useCallback(() => {
    refetchVotes()
    refetchClaims()
    refetchClaimableRewards()
    refetchHasClaimed()
  }, [refetchVotes, refetchClaims, refetchClaimableRewards, refetchHasClaimed])

  const isLoading = votesLoading || claimsLoading || claimableLoading || hasClaimedLoading

  return {
    rewards,
    claimHistory,
    stats,
    isLoading,
    error: votesError || claimsError,
    refetch,
  }
}
