'use client'

/**
 * Hook to fetch global statistics from the backend API
 * Used as a fallback when subgraph is unavailable
 */

import { useQuery } from '@tanstack/react-query'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface AnalyticsOverview {
  polls: {
    totalPolls: number
    pollsByChain: any[]
  }
  distributions: {
    totalDistributions: number
    totalAmount: string
    uniqueRecipients: number
    byEventType: any[]
  }
  users: {
    totalUsers: number
    totalRewards: string
    totalVotes: number
    activeUsers: number
  }
  timestamp: string
}

interface FormattedStats {
  totalPolls: number
  totalVotes: number
  totalFunding: number
  totalDistributions: number
  totalUsers: number
  totalVoters: number
  totalFunders: number
  whitelistedTokens: number
}

async function fetchAnalyticsOverview(): Promise<AnalyticsOverview> {
  const response = await fetch(`${API_BASE_URL}/api/analytics/overview`)
  if (!response.ok) {
    throw new Error('Failed to fetch analytics overview')
  }
  return response.json()
}

/**
 * Hook to fetch global stats from the backend API
 */
export function useApiStats() {
  const { data, isLoading, error } = useQuery<AnalyticsOverview, Error>({
    queryKey: ['api-analytics-overview'],
    queryFn: fetchAnalyticsOverview,
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  })

  // Transform API response to match subgraph stats format
  const stats: FormattedStats | null = data
    ? {
        totalPolls: data.polls?.totalPolls || 0,
        totalVotes: data.users?.totalVotes || 0,
        totalFunding: Number(data.distributions?.totalAmount || 0),
        totalDistributions: Number(data.distributions?.totalAmount || 0),
        totalUsers: data.users?.totalUsers || 0,
        totalVoters: data.users?.activeUsers || 0,
        totalFunders: data.distributions?.uniqueRecipients || 0,
        whitelistedTokens: 0, // Not available from API
      }
    : null

  return {
    stats,
    loading: isLoading,
    error,
  }
}
