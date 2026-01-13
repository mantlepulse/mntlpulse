/**
 * Hook to fetch poll fundings from The Graph subgraph
 */

'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import { apolloClient } from '@/lib/graphql/apollo-client'
import { GET_POLL_FUNDINGS } from '@/lib/graphql/queries/polls'
import { mapSubgraphFundingsToSimplified, type SimplifiedFunding } from '@/lib/graphql/mappers'
import type { GetPollFundingsResponse, PollFundingsQueryVariables } from '@/types/subgraph'

export function useSubgraphPollFundings(pollId: string | number, first = 100) {
  // Client-side only flag to prevent SSR issues
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Convert poll ID to bytes format
  const pollIdBytes = `0x${BigInt(pollId).toString(16).padStart(64, '0')}`

  const { data, loading, error, refetch } = useQuery<GetPollFundingsResponse, PollFundingsQueryVariables>(
    GET_POLL_FUNDINGS,
    {
      client: apolloClient,
      variables: { pollId: pollIdBytes, first },
      fetchPolicy: 'cache-and-network',
      skip: !pollId || !isClient, // Don't run during SSR
    }
  )

  const fundings: SimplifiedFunding[] = data?.fundings
    ? mapSubgraphFundingsToSimplified(data.fundings)
    : []

  // Calculate total funding amount
  const totalFunding = fundings.reduce((sum, f) => sum + f.amount, 0)

  return {
    fundings,
    totalFunding,
    fundingCount: fundings.length,
    loading,
    error,
    refetch,
  }
}
