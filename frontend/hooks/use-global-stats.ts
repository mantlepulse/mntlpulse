'use client'

/**
 * Unified global stats hook with subgraph -> API fallback
 * Uses subgraph when available, falls back to backend API when subgraph has errors
 */

import { useSubgraphGlobalStats } from '@/hooks/subgraph/use-subgraph-stats'
import { useApiStats } from '@/hooks/use-api-stats'

interface GlobalStats {
  totalPolls: number
  totalVotes: number
  totalFunding: number
  totalDistributions: number
  totalUsers: number
  totalVoters: number
  totalFunders: number
  whitelistedTokens: number
}

interface UseGlobalStatsReturn {
  stats: GlobalStats | null
  loading: boolean
  source: 'subgraph' | 'api'
  subgraphError: Error | undefined
}

/**
 * Hook that provides global stats with automatic fallback
 * - Always tries subgraph first (preferred source for stats)
 * - Falls back to backend API when subgraph has errors or no data
 */
export function useGlobalStats(): UseGlobalStatsReturn {
  // Fetch from both sources
  const {
    stats: subgraphStats,
    loading: subgraphLoading,
    error: subgraphError,
  } = useSubgraphGlobalStats()

  const { stats: apiStats, loading: apiLoading } = useApiStats()

  // Determine which data source to use
  // Prefer subgraph for stats (it's always indexed and up-to-date)
  // Fall back to API only if subgraph has errors or no data
  const useSubgraphData = subgraphStats && !subgraphError

  return {
    stats: useSubgraphData ? subgraphStats : apiStats,
    loading: useSubgraphData ? subgraphLoading : apiLoading,
    source: useSubgraphData ? 'subgraph' : 'api',
    subgraphError,
  }
}
