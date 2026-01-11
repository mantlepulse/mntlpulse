/**
 * Hook to fetch user fundings from The Graph subgraph
 * Returns all funding transactions made by a specific user address
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@apollo/client/react'
import { createApolloClient } from '@/lib/graphql/apollo-client'
import { GET_USER_FUNDINGS } from '@/lib/graphql/queries/polls'
import { getTokenSymbol } from '@/lib/graphql/mappers'
import type {
  GetExtendedUserFundingsResponse,
  UserQueryVariables,
  SubgraphUserFunding,
} from '@/types/subgraph'

/**
 * Formatted user funding for UI display
 */
export interface FormattedUserFunding {
  id: string
  pollId: string
  pollTitle: string
  pollStatus: 'active' | 'ended' | 'cancelled'
  pollTotalVotes: number
  pollTotalFunding: number
  pollEndTime: string
  funder: string
  tokenAddress: string
  tokenSymbol: string
  tokenDecimals: number
  amount: string
  amountFormatted: number
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
 * Map subgraph poll status to frontend format
 */
function mapPollStatus(status: string, isActive: boolean, endTime: string): 'active' | 'ended' | 'cancelled' {
  const endTimeMs = Number(endTime) * 1000
  const isEnded = Date.now() >= endTimeMs

  if (status === 'PAUSED') return 'cancelled'
  if (!isActive || isEnded || status === 'CLOSED' || status === 'FOR_CLAIMING') return 'ended'
  return 'active'
}

/**
 * Format a subgraph funding to UI format
 */
function formatFunding(funding: SubgraphUserFunding): FormattedUserFunding {
  const decimals = funding.token.decimals || 18
  const amountFormatted = Number(funding.amount) / Math.pow(10, decimals)

  return {
    id: funding.id,
    pollId: funding.poll.pollId,
    pollTitle: parsePollTitle(funding.poll.question),
    pollStatus: mapPollStatus(funding.poll.status, funding.poll.isActive, funding.poll.endTime),
    pollTotalVotes: Number(funding.poll.voteCount),
    pollTotalFunding: Number(funding.poll.totalFundingAmount) / Math.pow(10, decimals),
    pollEndTime: new Date(Number(funding.poll.endTime) * 1000).toISOString(),
    funder: funding.funder,
    tokenAddress: funding.token.id,
    tokenSymbol: funding.token.symbol || getTokenSymbol(funding.token.id),
    tokenDecimals: decimals,
    amount: funding.amount,
    amountFormatted,
    timestamp: new Date(Number(funding.timestamp) * 1000).toISOString(),
    transactionHash: funding.transactionHash,
  }
}

export function useUserFundings(userAddress: string | undefined, chainId: number = 84532, first = 100) {
  // Client-side only flag to prevent SSR issues
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Normalize address to lowercase for subgraph query
  const normalizedAddress = userAddress?.toLowerCase()

  // Create network-specific Apollo client
  const apolloClient = useMemo(() => createApolloClient(chainId), [chainId])

  const { data, loading, error, refetch } = useQuery<GetExtendedUserFundingsResponse, UserQueryVariables>(
    GET_USER_FUNDINGS,
    {
      client: apolloClient,
      variables: { user: normalizedAddress || '', first },
      fetchPolicy: 'cache-and-network',
      skip: !normalizedAddress || !isClient,
    }
  )

  // Format the fundings for UI
  const fundings = useMemo<FormattedUserFunding[]>(() => {
    if (!data?.fundings) return []
    return data.fundings.map(formatFunding)
  }, [data])

  // Calculate totals
  const totals = useMemo(() => {
    return fundings.reduce(
      (acc, f) => ({
        totalFunded: acc.totalFunded + f.amountFormatted,
        fundingCount: acc.fundingCount + 1,
      }),
      { totalFunded: 0, fundingCount: 0 }
    )
  }, [fundings])

  return {
    fundings,
    totalFunded: totals.totalFunded,
    fundingCount: totals.fundingCount,
    loading,
    error,
    refetch,
  }
}
