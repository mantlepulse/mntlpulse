'use client'

/**
 * Hook to fetch creator dashboard data from the subgraph
 * Returns user stats, polls created, and calculated dashboard metrics
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery } from '@apollo/client/react'
import { apolloClient } from '@/lib/graphql/apollo-client'
import { GET_USER_STATS, GET_POLLS_BY_CREATOR } from '@/lib/graphql/queries/polls'
import { formatEther } from 'viem'
import type {
  SubgraphUser,
  SubgraphCreatorPoll,
  GetUserStatsResponse,
  GetPollsByCreatorResponse,
} from '@/types/subgraph'

export interface CreatorDashboardStats {
  totalPolls: number
  activePolls: number
  endedPolls: number
  totalResponses: number
  totalFunded: string // Formatted ETH string
  pendingDistributions: number
}

export interface CreatorPoll {
  id: string
  pollId: number
  question: string
  options: string[]
  votes: bigint[]
  totalVotes: number
  endTime: number
  isActive: boolean
  totalFunding: bigint
  totalFundingAmount: bigint
  voteCount: number
  voterCount: number
  distributionMode: 0 | 1 | 2 // MANUAL_PULL = 0, MANUAL_PUSH = 1, AUTOMATED = 2
  fundingType: 'none' | 'self' | 'community'
  status: 'active' | 'closed' | 'for_claiming' | 'paused'
  createdAt: Date
  fundingToken?: string
  fundingTokenSymbol?: string
}

interface UseCreatorDashboardDataReturn {
  stats: CreatorDashboardStats
  polls: CreatorPoll[]
  userStats: SubgraphUser | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

// Map distribution mode string to number
const distributionModeMap: Record<string, 0 | 1 | 2> = {
  MANUAL_PULL: 0,
  MANUAL_PUSH: 1,
  AUTOMATED: 2,
}

// Map funding type string to lowercase
const fundingTypeMap: Record<string, 'none' | 'self' | 'community'> = {
  NONE: 'none',
  SELF: 'self',
  COMMUNITY: 'community',
}

// Map status string to lowercase
const statusMap: Record<string, 'active' | 'closed' | 'for_claiming' | 'paused'> = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  FOR_CLAIMING: 'for_claiming',
  PAUSED: 'paused',
}

/**
 * Transform subgraph poll to creator poll format
 */
function transformPoll(poll: SubgraphCreatorPoll): CreatorPoll {
  const votes = poll.votes.map(v => BigInt(v))
  const totalVotes = votes.reduce((sum, v) => sum + v, BigInt(0))

  return {
    id: poll.id,
    pollId: parseInt(poll.pollId, 10),
    question: poll.question,
    options: poll.options,
    votes,
    totalVotes: Number(totalVotes),
    endTime: parseInt(poll.endTime, 10),
    isActive: poll.isActive,
    totalFunding: BigInt(poll.totalFunding),
    totalFundingAmount: BigInt(poll.totalFundingAmount),
    voteCount: parseInt(poll.voteCount, 10),
    voterCount: parseInt(poll.voterCount, 10),
    distributionMode: distributionModeMap[poll.distributionMode] ?? 0,
    fundingType: fundingTypeMap[poll.fundingType] ?? 'none',
    status: statusMap[poll.status] ?? 'active',
    createdAt: new Date(parseInt(poll.createdAt, 10) * 1000),
  }
}

/**
 * Hook that provides creator dashboard data from the subgraph
 */
export function useCreatorDashboardData(
  creatorAddress: string | undefined
): UseCreatorDashboardDataReturn {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // User ID in subgraph is lowercase address
  const userId = creatorAddress?.toLowerCase()

  // Query user stats
  const {
    data: userData,
    loading: userLoading,
    error: userError,
    refetch: refetchUser,
  } = useQuery<GetUserStatsResponse>(GET_USER_STATS, {
    client: apolloClient,
    variables: { id: userId },
    skip: !isClient || !userId,
    fetchPolicy: 'cache-and-network',
  })

  // Query polls by creator
  const {
    data: pollsData,
    loading: pollsLoading,
    error: pollsError,
    refetch: refetchPolls,
  } = useQuery<GetPollsByCreatorResponse>(GET_POLLS_BY_CREATOR, {
    client: apolloClient,
    variables: { creator: userId, first: 100 },
    skip: !isClient || !userId,
    fetchPolicy: 'cache-and-network',
  })

  // Transform polls data
  const polls = useMemo(() => {
    if (!pollsData?.polls) return []
    return pollsData.polls.map(transformPoll)
  }, [pollsData])

  // Calculate dashboard stats from polls
  const stats = useMemo((): CreatorDashboardStats => {
    const totalPolls = polls.length
    const activePolls = polls.filter(p => p.isActive && p.status === 'active').length
    const endedPolls = polls.filter(p => !p.isActive || p.status === 'closed').length

    // Total responses = sum of all votes across all polls
    const totalResponses = polls.reduce((sum, poll) => sum + poll.voteCount, 0)

    // Total funded = sum of all funding amounts
    const totalFundedWei = polls.reduce(
      (sum, poll) => sum + poll.totalFundingAmount,
      BigInt(0)
    )
    const totalFunded = `${parseFloat(formatEther(totalFundedWei)).toFixed(4)} ETH`

    // Pending distributions = polls that have ended with funding but rewards not claimed
    // A poll has pending distributions if:
    // - status is FOR_CLAIMING, or
    // - isActive is false AND totalFundingAmount > 0 AND distributionMode is MANUAL_PULL or MANUAL_PUSH
    const pendingDistributions = polls.filter(poll => {
      if (poll.status === 'for_claiming') return true
      if (!poll.isActive && poll.totalFundingAmount > BigInt(0)) {
        // MANUAL_PULL (0) or MANUAL_PUSH (1) require manual distribution
        return poll.distributionMode === 0 || poll.distributionMode === 1
      }
      return false
    }).length

    return {
      totalPolls,
      activePolls,
      endedPolls,
      totalResponses,
      totalFunded,
      pendingDistributions,
    }
  }, [polls])

  // Combined refetch
  const refetch = useCallback(() => {
    refetchUser()
    refetchPolls()
  }, [refetchUser, refetchPolls])

  // Combined loading state
  const loading = userLoading || pollsLoading

  // Combined error
  const error = userError || pollsError || null

  return {
    stats,
    polls,
    userStats: userData?.user ?? null,
    loading,
    error,
    refetch,
  }
}
