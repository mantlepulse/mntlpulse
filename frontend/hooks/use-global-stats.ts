'use client'

/**
 * Unified global stats hook with subgraph -> API fallback
 * Uses subgraph when available, falls back to backend API when subgraph has errors
 */

import { useSubgraphGlobalStats } from '@/hooks/subgraph/use-subgraph-stats'
import { useApiStats } from '@/hooks/use-api-stats'
import { useDataSource } from '@/contexts/data-source-context'

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
 * - When data source is "subgraph" and subgraph is healthy: uses subgraph
 * - When data source is "contract" or subgraph has errors: uses backend API
 */
export function useGlobalStats(): UseGlobalStatsReturn {
  const { isSubgraph } = useDataSource()

  // Fetch from both sources
  const {
    stats: subgraphStats,
    loading: subgraphLoading,
    error: subgraphError,
  } = useSubgraphGlobalStats()

  const { stats: apiStats, loading: apiLoading } = useApiStats()

  // Determine which data source to use
  // Use subgraph if:
  // 1. User selected subgraph data source AND
  // 2. Subgraph has data AND
  // 3. No subgraph errors
  const useSubgraphData = isSubgraph && subgraphStats && !subgraphError

  return {
    stats: useSubgraphData ? subgraphStats : apiStats,
    loading: useSubgraphData ? subgraphLoading : apiLoading,
    source: useSubgraphData ? 'subgraph' : 'api',
    subgraphError,
  }
}
