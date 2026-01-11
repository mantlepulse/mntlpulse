"use client"

/**
 * Context provider for caching user's voted polls
 * Fetches from subgraph on wallet connect and caches in localStorage
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { useAccount, useChainId } from "wagmi"
import { createApolloClient } from "@/lib/graphql/apollo-client"
import { GET_USER_VOTES } from "@/lib/graphql/queries/polls"
import {
  getVotedPollsCache,
  setVotedPollsCache,
  addVotedPollToCache,
  isCacheValid,
  VotedPollsCache,
} from "@/lib/storage/voted-polls-storage"
import type { GetUserVotesResponse } from "@/types/subgraph"

interface VotedPollsCacheContextType {
  votedPollIds: Set<string>
  isLoading: boolean
  error: Error | null
  hasVotedOnPoll: (pollId: string) => boolean
  addVotedPoll: (pollId: string) => void
  refreshCache: () => Promise<void>
}

const VotedPollsCacheContext = createContext<VotedPollsCacheContextType | undefined>(undefined)

const PAGE_SIZE = 100

/**
 * Convert subgraph poll ID (hex bytes like "0x01") to numeric string
 */
function hexToNumericString(hexId: string): string {
  // If it's already numeric, return as-is
  if (!hexId.startsWith("0x")) {
    return hexId
  }
  return parseInt(hexId, 16).toString()
}

export function VotedPollsCacheProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [votedPollIds, setVotedPollIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  // Fetch all user votes with pagination
  const fetchAllUserVotes = useCallback(async (userAddress: string, currentChainId: number) => {
    const allPollIds: string[] = []
    let hasMore = true
    let skip = 0

    // Create client for the current chain
    const client = createApolloClient(currentChainId)

    while (hasMore) {
      const { data } = await client.query<GetUserVotesResponse>({
        query: GET_USER_VOTES,
        variables: {
          user: userAddress.toLowerCase(),
          first: PAGE_SIZE,
          skip,
        },
        fetchPolicy: "network-only",
      })

      const votes = data?.votes || []

      // Extract poll IDs and convert from hex to numeric string
      votes.forEach((vote) => {
        const pollIdNum = hexToNumericString(vote.poll.id)
        if (!allPollIds.includes(pollIdNum)) {
          allPollIds.push(pollIdNum)
        }
      })

      hasMore = votes.length === PAGE_SIZE
      skip += PAGE_SIZE
    }

    return allPollIds
  }, [])

  // Main fetch function
  const refreshCache = useCallback(async () => {
    if (!address || !chainId) return

    setIsLoading(true)
    setError(null)

    try {
      const pollIds = await fetchAllUserVotes(address, chainId)

      // Update localStorage cache
      const cache: VotedPollsCache = {
        pollIds,
        lastFetchedAt: Date.now(),
        totalCount: pollIds.length,
      }
      setVotedPollsCache(address, chainId, cache)

      // Update state
      setVotedPollIds(new Set(pollIds))
      setHasFetched(true)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch user votes"))
      console.error("Failed to fetch user votes:", err)
    } finally {
      setIsLoading(false)
    }
  }, [address, chainId, fetchAllUserVotes])

  // Load from cache or fetch when wallet connects
  useEffect(() => {
    if (!isConnected || !address || !chainId) {
      setVotedPollIds(new Set())
      setHasFetched(false)
      return
    }

    // Try to load from cache first
    const cache = getVotedPollsCache(address, chainId)

    if (cache && isCacheValid(cache)) {
      // Use cached data
      setVotedPollIds(new Set(cache.pollIds))
      setHasFetched(true)
    } else {
      // Fetch fresh data
      refreshCache()
    }
  }, [isConnected, address, chainId, refreshCache])

  // Check if user voted on a poll
  const hasVotedOnPoll = useCallback(
    (pollId: string): boolean => {
      return votedPollIds.has(pollId)
    },
    [votedPollIds]
  )

  // Add voted poll to cache (called after successful vote)
  const addVotedPoll = useCallback(
    (pollId: string) => {
      if (!address || !chainId) return

      // Update state
      setVotedPollIds((prev) => new Set([...prev, pollId]))

      // Update localStorage
      addVotedPollToCache(address, chainId, pollId)
    },
    [address, chainId]
  )

  const value: VotedPollsCacheContextType = {
    votedPollIds,
    isLoading,
    error,
    hasVotedOnPoll,
    addVotedPoll,
    refreshCache,
  }

  return <VotedPollsCacheContext.Provider value={value}>{children}</VotedPollsCacheContext.Provider>
}

export function useVotedPollsCache() {
  const context = useContext(VotedPollsCacheContext)
  if (context === undefined) {
    throw new Error("useVotedPollsCache must be used within a VotedPollsCacheProvider")
  }
  return context
}
