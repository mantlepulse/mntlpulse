'use client'

/**
 * Hook to fetch closed polls for a creator from the subgraph
 */

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@apollo/client/react'
import { createApolloClient } from '@/lib/graphql/apollo-client'
import { GET_CLOSED_POLLS_BY_CREATOR } from '@/lib/graphql/queries/polls'
import { getTokenSymbol } from '@/lib/contracts/token-config'
import type { CreatorPoll } from './use-creator-dashboard-data'

interface SubgraphClosedPoll {
  id: string
  pollId: string
  question: string
  options: string[]
  votes: string[]
  endTime: string
  isActive: boolean
  totalFunding: string
  totalFundingAmount: string
  fundingToken: string
  voteCount: string
  voterCount: string
  distributionMode: string
  fundingType: string
  status: string
  createdAt: string
  votingType: string
}

interface GetClosedPollsResponse {
  polls: SubgraphClosedPoll[]
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

function transformClosedPoll(poll: SubgraphClosedPoll, chainId: number): CreatorPoll {
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
    status: statusMap[poll.status] ?? 'closed',
    createdAt: new Date(parseInt(poll.createdAt, 10) * 1000),
    fundingToken: poll.fundingToken,
    fundingTokenSymbol: getTokenSymbol(chainId, poll.fundingToken as `0x${string}`) || 'ETH',
  }
}

interface UseClosedPollsReturn {
  polls: CreatorPoll[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useClosedPolls(
  creatorAddress: string | undefined,
  chainId: number
): UseClosedPollsReturn {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Create network-specific Apollo client
  const client = useMemo(() => createApolloClient(chainId), [chainId])

  // User ID in subgraph is lowercase address
  const creator = creatorAddress?.toLowerCase()

  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery<GetClosedPollsResponse>(GET_CLOSED_POLLS_BY_CREATOR, {
    client,
    variables: { creator, first: 100 },
    skip: !isClient || !creator,
    fetchPolicy: 'cache-and-network',
    onError: (err) => {
      console.error('[useClosedPolls] GraphQL error:', err)
    },
  })

  // Debug logging
  useEffect(() => {
    if (isClient && creator) {
      console.log('[useClosedPolls] Query state:', {
        creator,
        chainId,
        loading,
        error: error?.message,
        dataPolls: data?.polls?.length ?? 'no data',
      })
    }
  }, [isClient, creator, chainId, loading, error, data])

  // Transform polls data
  const polls = useMemo(() => {
    if (!data?.polls) return []
    return data.polls.map(poll => transformClosedPoll(poll, chainId))
  }, [data, chainId])

  return {
    polls,
    loading,
    error: error || null,
    refetch,
  }
}
