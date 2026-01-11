/**
 * Hook to fetch user distributions (refunds, claims, rewards) from The Graph subgraph
 * Returns all distribution events where the user is the recipient
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@apollo/client/react'
import { createApolloClient } from '@/lib/graphql/apollo-client'
import { GET_USER_DISTRIBUTIONS } from '@/lib/graphql/queries/polls'
import { getTokenSymbol } from '@/lib/graphql/mappers'
import type {
  GetUserDistributionsResponse,
  UserDistributionsQueryVariables,
  SubgraphDistribution,
} from '@/types/subgraph'

/**
 * Formatted user distribution for UI display
 */
export interface FormattedUserDistribution {
  id: string
  pollId: string
  pollTitle: string
  recipient: string
  tokenAddress: string
  tokenSymbol: string
  tokenDecimals: number
  amount: string
  amountFormatted: number
  eventType: 'withdrawn' | 'distributed' | 'claimed'
  timestamp: string
  transactionHash: string
}

/**
 * Parse poll title from question metadata
 * Format: "TITLE|TOKEN:SYMBOL"
 */
function parsePollTitle(question: string): string {
  const parts = question.split('|TOKEN:')
  return parts[0]
}

/**
 * Map subgraph event type to lowercase frontend format
 */
function mapEventType(eventType: string): 'withdrawn' | 'distributed' | 'claimed' {
  switch (eventType) {
    case 'WITHDRAWN':
      return 'withdrawn'
    case 'DISTRIBUTED':
      return 'distributed'
    case 'CLAIMED':
      return 'claimed'
    default:
      return 'distributed'
  }
}

/**
 * Format a subgraph distribution to UI format
 */
function formatDistribution(distribution: SubgraphDistribution): FormattedUserDistribution {
  const decimals = distribution.token.decimals || 18
  const amountFormatted = Number(distribution.amount) / Math.pow(10, decimals)

  return {
    id: distribution.id,
    pollId: distribution.poll.pollId,
    pollTitle: parsePollTitle(distribution.poll.question),
    recipient: distribution.recipient.id,
    tokenAddress: distribution.token.id,
    tokenSymbol: distribution.token.symbol || getTokenSymbol(distribution.token.id),
    tokenDecimals: decimals,
    amount: distribution.amount,
    amountFormatted,
    eventType: mapEventType(distribution.eventType),
    timestamp: new Date(Number(distribution.timestamp) * 1000).toISOString(),
    transactionHash: distribution.transactionHash,
  }
}

export function useUserDistributions(userAddress: string | undefined, chainId: number = 84532, first = 100) {
  // Client-side only flag to prevent SSR issues
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Normalize address to lowercase for subgraph query
  const normalizedAddress = userAddress?.toLowerCase()

  // Create network-specific Apollo client
  const apolloClient = useMemo(() => createApolloClient(chainId), [chainId])

  const { data, loading, error, refetch } = useQuery<GetUserDistributionsResponse, UserDistributionsQueryVariables>(
    GET_USER_DISTRIBUTIONS,
    {
      client: apolloClient,
      variables: { user: normalizedAddress || '', first },
      fetchPolicy: 'cache-and-network',
      skip: !normalizedAddress || !isClient,
    }
  )

  // Format the distributions for UI
  const distributions = useMemo<FormattedUserDistribution[]>(() => {
    if (!data?.distributions) return []
    return data.distributions.map(formatDistribution)
  }, [data])

  // Calculate totals by type
  const totals = useMemo(() => {
    return distributions.reduce(
      (acc, d) => {
        if (d.eventType === 'withdrawn') {
          acc.totalWithdrawn += d.amountFormatted
          acc.withdrawnCount += 1
        } else if (d.eventType === 'claimed') {
          acc.totalClaimed += d.amountFormatted
          acc.claimedCount += 1
        } else {
          acc.totalDistributed += d.amountFormatted
          acc.distributedCount += 1
        }
        return acc
      },
      {
        totalWithdrawn: 0,
        totalClaimed: 0,
        totalDistributed: 0,
        withdrawnCount: 0,
        claimedCount: 0,
        distributedCount: 0,
      }
    )
  }, [distributions])

  return {
    distributions,
    ...totals,
    loading,
    error,
    refetch,
  }
}
