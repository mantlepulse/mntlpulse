'use client'

/**
 * Hook to fetch polls by creator address using contract data
 * This is used by quest dialogs to show creator's polls
 */

import { useMemo } from 'react'
import { useChainId } from 'wagmi'
import { useActivePolls, usePoll, formatPollData, formatVotes, formatETH, formatTimestamp } from '@/lib/contracts/polls-contract-utils'
import type { FormattedPoll } from '@/hooks/use-polls'
import { parsePollMetadata } from '@/hooks/use-polls'

// Maximum number of polls to fetch at once
const MAX_POLLS_TO_FETCH = 50

// Helper to safely get poll ID from array
const getPollId = (ids: readonly bigint[] | undefined, index: number): number => {
  if (!ids || index >= ids.length) return -1
  return Number(ids[index])
}

/**
 * Hook to fetch active polls, optionally filtered by creator
 * If creatorAddress is provided, only returns polls by that creator
 * If not provided, returns all active polls
 */
export function usePollsByCreator(creatorAddress?: string, maxPolls = 20) {
  const chainId = useChainId()
  const { data: activePollIds, isLoading: idsLoading, error: idsError } = useActivePolls()

  // Cast to proper type
  const pollIds = activePollIds as readonly bigint[] | undefined

  // Pre-allocate poll queries (hooks must be called unconditionally)
  const pollLimit = Math.min(maxPolls, MAX_POLLS_TO_FETCH)

  // Create array of poll queries
  const poll0 = usePoll(getPollId(pollIds, 0))
  const poll1 = usePoll(getPollId(pollIds, 1))
  const poll2 = usePoll(getPollId(pollIds, 2))
  const poll3 = usePoll(getPollId(pollIds, 3))
  const poll4 = usePoll(getPollId(pollIds, 4))
  const poll5 = usePoll(getPollId(pollIds, 5))
  const poll6 = usePoll(getPollId(pollIds, 6))
  const poll7 = usePoll(getPollId(pollIds, 7))
  const poll8 = usePoll(getPollId(pollIds, 8))
  const poll9 = usePoll(getPollId(pollIds, 9))
  const poll10 = usePoll(getPollId(pollIds, 10))
  const poll11 = usePoll(getPollId(pollIds, 11))
  const poll12 = usePoll(getPollId(pollIds, 12))
  const poll13 = usePoll(getPollId(pollIds, 13))
  const poll14 = usePoll(getPollId(pollIds, 14))
  const poll15 = usePoll(getPollId(pollIds, 15))
  const poll16 = usePoll(getPollId(pollIds, 16))
  const poll17 = usePoll(getPollId(pollIds, 17))
  const poll18 = usePoll(getPollId(pollIds, 18))
  const poll19 = usePoll(getPollId(pollIds, 19))

  const pollQueries = [
    poll0, poll1, poll2, poll3, poll4, poll5, poll6, poll7, poll8, poll9,
    poll10, poll11, poll12, poll13, poll14, poll15, poll16, poll17, poll18, poll19,
  ]

  // Check if any poll is still loading
  const pollsLoading = pollQueries.some((q, i) =>
    pollIds && i < pollIds.length && q.isLoading
  )

  // Format and filter polls
  const polls = useMemo<FormattedPoll[]>(() => {
    if (!pollIds || pollIds.length === 0) return []

    const normalizedCreator = creatorAddress?.toLowerCase()
    const results: FormattedPoll[] = []

    for (let i = 0; i < Math.min(pollIds.length, pollLimit); i++) {
      const pollData = pollQueries[i]?.data
      if (!pollData) continue

      try {
        const formatted = formatPollData(pollData)

        // Filter by creator if specified
        if (normalizedCreator && formatted.creator.toLowerCase() !== normalizedCreator) {
          continue
        }

        const totalVotes = formatted.votes.reduce((sum, votes) => sum + formatVotes(votes), 0)

        const options = formatted.options.map((option, index) => {
          const votes = formatVotes(formatted.votes[index])
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0

          return {
            id: `${formatted.id}-${index}`,
            text: option,
            votes,
            percentage,
          }
        })

        // Parse metadata from question/title
        const metadata = parsePollMetadata(formatted.question)

        const formattedPoll: FormattedPoll = {
          id: formatted.id.toString(),
          title: metadata.title,
          creator: formatted.creator,
          createdAt: new Date().toISOString(),
          endsAt: formatTimestamp(formatted.endTime).toISOString(),
          totalVotes,
          totalReward: parseFloat(formatETH(formatted.totalFunding)),
          status: formatted.isActive && Date.now() < Number(formatted.endTime) * 1000 ? 'active' : 'ended',
          category: 'Governance',
          fundingType: formatted.totalFunding > BigInt(0) ? 'community' : 'none',
          fundingToken: metadata.token,
          chainId,
          options,
        }

        results.push(formattedPoll)
      } catch (err) {
        console.error(`Error formatting poll ${i}:`, err)
      }
    }

    return results
  }, [pollIds, pollQueries, creatorAddress, chainId, pollLimit])

  return {
    polls,
    loading: idsLoading || pollsLoading,
    error: idsError,
    refetch: () => {
      // Note: wagmi useReadContract doesn't have a simple refetch
      // The data will refetch on chain changes or component remount
    },
  }
}

/**
 * Hook to get all active polls (not filtered by creator)
 */
export function useAllActivePolls(maxPolls = 20) {
  return usePollsByCreator(undefined, maxPolls)
}

/**
 * Hook to fetch specific polls by their IDs
 * Uses individual usePoll hooks for each ID
 */
export function usePollsByIds(pollIds: string[]) {
  const chainId = useChainId()

  // Pre-allocate up to 10 poll queries
  const poll0 = usePoll(pollIds[0] ? Number(pollIds[0]) : -1)
  const poll1 = usePoll(pollIds[1] ? Number(pollIds[1]) : -1)
  const poll2 = usePoll(pollIds[2] ? Number(pollIds[2]) : -1)
  const poll3 = usePoll(pollIds[3] ? Number(pollIds[3]) : -1)
  const poll4 = usePoll(pollIds[4] ? Number(pollIds[4]) : -1)
  const poll5 = usePoll(pollIds[5] ? Number(pollIds[5]) : -1)
  const poll6 = usePoll(pollIds[6] ? Number(pollIds[6]) : -1)
  const poll7 = usePoll(pollIds[7] ? Number(pollIds[7]) : -1)
  const poll8 = usePoll(pollIds[8] ? Number(pollIds[8]) : -1)
  const poll9 = usePoll(pollIds[9] ? Number(pollIds[9]) : -1)

  const pollQueries = [poll0, poll1, poll2, poll3, poll4, poll5, poll6, poll7, poll8, poll9]

  // Check if any poll is still loading
  const loading = pollQueries.some((q, i) =>
    pollIds[i] !== undefined && q.isLoading
  )

  // Check for errors
  const error = pollQueries.find((q, i) =>
    pollIds[i] !== undefined && q.error
  )?.error

  // Format polls
  const polls = useMemo<FormattedPoll[]>(() => {
    if (pollIds.length === 0) return []

    const results: FormattedPoll[] = []

    for (let i = 0; i < Math.min(pollIds.length, 10); i++) {
      const pollData = pollQueries[i]?.data
      if (!pollData) continue

      try {
        const formatted = formatPollData(pollData)
        const totalVotes = formatted.votes.reduce((sum, votes) => sum + formatVotes(votes), 0)

        const options = formatted.options.map((option, index) => {
          const votes = formatVotes(formatted.votes[index])
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0

          return {
            id: `${formatted.id}-${index}`,
            text: option,
            votes,
            percentage,
          }
        })

        const metadata = parsePollMetadata(formatted.question)

        const formattedPoll: FormattedPoll = {
          id: formatted.id.toString(),
          title: metadata.title,
          creator: formatted.creator,
          createdAt: new Date().toISOString(),
          endsAt: formatTimestamp(formatted.endTime).toISOString(),
          totalVotes,
          totalReward: parseFloat(formatETH(formatted.totalFunding)),
          status: formatted.isActive && Date.now() < Number(formatted.endTime) * 1000 ? 'active' : 'ended',
          category: 'Governance',
          fundingType: formatted.totalFunding > BigInt(0) ? 'community' : 'none',
          fundingToken: metadata.token,
          chainId,
          options,
        }

        results.push(formattedPoll)
      } catch (err) {
        console.error(`Error formatting poll ${pollIds[i]}:`, err)
      }
    }

    return results
  }, [pollIds, pollQueries, chainId])

  return {
    polls,
    loading,
    error,
  }
}
