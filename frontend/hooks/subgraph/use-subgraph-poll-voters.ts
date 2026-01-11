/**
 * Hook to fetch poll voters from The Graph subgraph
 * Used for bulk distribution to get list of recipients
 */

'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import { apolloClient } from '@/lib/graphql/apollo-client'
import { GET_POLL_VOTERS } from '@/lib/graphql/queries/polls'

export interface PollVoter {
  address: string
  votedOption: number
  timestamp: Date
}

interface GetPollVotersResponse {
  votes: {
    id: string
    voter: string
    optionIndex: number
    timestamp: string
  }[]
}

interface PollVotersQueryVariables {
  pollId: string
  first?: number
}

export function useSubgraphPollVoters(pollId: string | number, first = 1000) {
  // Client-side only flag to prevent SSR issues
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Convert poll ID to bytes format
  const pollIdBytes = `0x${BigInt(pollId).toString(16).padStart(64, '0')}`

  const { data, loading, error, refetch } = useQuery<GetPollVotersResponse, PollVotersQueryVariables>(
    GET_POLL_VOTERS,
    {
      client: apolloClient,
      variables: { pollId: pollIdBytes, first },
      fetchPolicy: 'cache-and-network',
      skip: !pollId || !isClient, // Don't run during SSR
    }
  )

  // Get unique voters (in case someone voted multiple times)
  // Keep first vote for each unique voter
  const voters: PollVoter[] = []
  const seenVoters = new Set<string>()

  if (data?.votes) {
    for (const vote of data.votes) {
      const voterAddress = vote.voter.toLowerCase()
      if (!seenVoters.has(voterAddress)) {
        seenVoters.add(voterAddress)
        voters.push({
          address: vote.voter,
          votedOption: Number(vote.optionIndex),
          timestamp: new Date(Number(vote.timestamp) * 1000),
        })
      }
    }
  }

  return {
    voters,
    voterCount: voters.length,
    loading,
    error,
    refetch,
  }
}
