/**
 * Hook to fetch statistics from The Graph subgraph
 */

'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import { apolloClient } from '@/lib/graphql/apollo-client'
import { GET_GLOBAL_STATS, GET_DAILY_STATS } from '@/lib/graphql/queries/polls'
import type { GetGlobalStatsResponse, GetDailyStatsResponse } from '@/types/subgraph'

export function useSubgraphGlobalStats() {
  // Client-side only flag to prevent SSR issues
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const { data, loading, error } = useQuery<GetGlobalStatsResponse>(GET_GLOBAL_STATS, {
    client: apolloClient,
    fetchPolicy: 'cache-and-network',
    skip: !isClient, // Don't run during SSR
  })

  const stats = data?.globalStats

  return {
    stats: stats
      ? {
          totalPolls: Number(stats.totalPolls),
          totalVotes: Number(stats.totalVotes),
          totalFunding: Number(stats.totalFunding),
          totalDistributions: Number(stats.totalDistributions),
          totalUsers: Number(stats.totalUsers),
          totalVoters: Number(stats.totalVoters),
          totalFunders: Number(stats.totalFunders),
          whitelistedTokens: Number(stats.whitelistedTokens),
        }
      : null,
    loading,
    error,
  }
}

export function useSubgraphDailyStats(days = 30) {
  // Client-side only flag to prevent SSR issues
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const { data, loading, error } = useQuery<GetDailyStatsResponse>(GET_DAILY_STATS, {
    client: apolloClient,
    variables: { first: days },
    fetchPolicy: 'cache-and-network',
    skip: !isClient, // Don't run during SSR
  })

  const dailyStats = data?.dailyStats || []

  const stats = dailyStats.map(day => ({
    date: new Date(Number(day.day) * 1000).toISOString().split('T')[0],
    polls: Number(day.dailyPolls),
    votes: Number(day.dailyVotes),
    funding: Number(day.dailyFunding),
    distributions: Number(day.dailyDistributions),
    activeUsers: Number(day.dailyActiveUsers),
  }))

  return {
    stats,
    loading,
    error,
  }
}
