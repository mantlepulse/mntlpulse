"use client"

/**
 * Hook to check if a user has voted on a specific poll
 * Uses cache first, falls back to contract call if not in cache
 */

import { useVotedPollsCache } from "@/contexts/voted-polls-cache-context"
import { useHasUserVoted } from "@/lib/contracts/polls-contract-utils"
import { useAccount } from "wagmi"

export function useHasVotedOnPoll(pollId: string | number) {
  const { address } = useAccount()
  const pollIdStr = pollId.toString()

  // Get from cache context
  const { hasVotedOnPoll, isLoading: cacheLoading } = useVotedPollsCache()
  const cachedResult = hasVotedOnPoll(pollIdStr)

  // Fallback to contract (for newly created polls not yet in cache)
  const {
    data: contractResult,
    isLoading: contractLoading,
    refetch,
  } = useHasUserVoted(parseInt(pollIdStr), address)

  // Use cached result if true, otherwise use contract result
  // This way, if cache says "voted", we trust it immediately
  // If cache says "not voted", we verify with contract (for new polls)
  const hasVoted = cachedResult || (contractResult ?? false)

  return {
    hasVoted,
    isLoading: cacheLoading || contractLoading,
    // Expose refetch for manual refresh
    refetch,
    // Whether the result came from cache
    fromCache: cachedResult,
  }
}
