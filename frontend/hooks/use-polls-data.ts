'use client'

/**
 * Unified polls data hook that respects data source selection
 * Uses subgraph when selected, falls back to contract when "contract" is selected
 * Implements incremental loading - appends new polls on "Load More"
 */

import { useDataSource } from '@/contexts/data-source-context'
import { useSubgraphActivePolls } from '@/hooks/subgraph/use-subgraph-polls'
import { useContractPollsPaginated } from '@/hooks/use-contract-polls-paginated'
import type { FormattedPoll } from '@/hooks/use-polls'

interface UsePollsDataOptions {
  pageSize?: number
}

interface UsePollsDataReturn {
  polls: FormattedPoll[]
  loading: boolean
  loadingMore: boolean
  error: Error | null | undefined
  hasMore: boolean
  loadMore: () => void
  refetch: () => void
  refetchPoll: (pollId: number) => void
  totalCount: number
  source: 'subgraph' | 'contract'
}

/**
 * Hook that provides polls data based on user's data source preference
 * - When data source is "subgraph": uses The Graph subgraph
 * - When data source is "contract": uses direct contract reads via multicall
 *
 * Both sources support incremental loading (Load More appends results)
 */
export function usePollsData(options: UsePollsDataOptions = {}): UsePollsDataReturn {
  const { pageSize = 6 } = options
  const { isSubgraph, isContract } = useDataSource()

  // Always call both hooks (React rules of hooks)
  const subgraphResult = useSubgraphActivePolls(pageSize)
  const contractResult = useContractPollsPaginated({ pageSize })

  // Return based on data source selection
  if (isSubgraph) {
    console.log('[usePollsData] Using SUBGRAPH data source')
    return {
      polls: subgraphResult.polls,
      loading: subgraphResult.loading,
      loadingMore: subgraphResult.loadingMore,
      error: subgraphResult.error,
      hasMore: subgraphResult.hasMore,
      loadMore: subgraphResult.loadMore,
      refetch: subgraphResult.refetch,
      refetchPoll: subgraphResult.refetchPoll,
      totalCount: subgraphResult.polls.length + (subgraphResult.hasMore ? pageSize : 0),
      source: 'subgraph',
    }
  }

  // Default to contract
  console.log('[usePollsData] Using CONTRACT data source')
  return {
    polls: contractResult.polls,
    loading: contractResult.loading,
    loadingMore: contractResult.loadingMore,
    error: contractResult.error,
    hasMore: contractResult.hasMore,
    loadMore: contractResult.loadMore,
    refetch: contractResult.refetch,
    refetchPoll: contractResult.refetchPoll,
    totalCount: contractResult.totalCount,
    source: 'contract',
  }
}
