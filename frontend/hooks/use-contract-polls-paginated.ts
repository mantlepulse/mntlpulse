'use client'

/**
 * Hook for paginated contract-based poll fetching using multicall
 * Used when data source is set to "contract"
 * Implements incremental loading - appends new polls instead of refetching all
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useReadContracts, useChainId, useAccount } from 'wagmi'
import { Address } from 'viem'
import {
  useActivePolls,
  usePollsContractAddress,
} from '@/lib/contracts/polls-contract-utils'
import { POLLS_CONTRACT_ABI, FundingType } from '@/lib/contracts/polls-contract'
import { getTokenSymbol, TOKEN_INFO } from '@/lib/contracts/token-config'
import type { FormattedPoll } from '@/hooks/use-polls'

interface UseContractPollsPaginatedOptions {
  pageSize?: number
}

interface UseContractPollsPaginatedReturn {
  polls: FormattedPoll[]
  loading: boolean
  loadingMore: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => void
  refetch: () => void
  refetchPoll: (pollId: number) => void
  totalCount: number
}

/**
 * Hook that fetches polls from the contract with pagination using multicall
 * Uses incremental loading to append new polls without refetching existing ones
 */
export function useContractPollsPaginated(
  options: UseContractPollsPaginatedOptions = {}
): UseContractPollsPaginatedReturn {
  const { pageSize = 6 } = options
  const contractAddress = usePollsContractAddress()
  const chainId = useChainId()
  const { address: userAddress } = useAccount()

  // Get all active poll IDs
  const {
    data: allActivePollIds,
    isLoading: idsLoading,
    error: idsError,
    refetch: refetchIds,
  } = useActivePolls()

  // Track accumulated polls (persisted across loadMore calls)
  const [accumulatedPolls, setAccumulatedPolls] = useState<FormattedPoll[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Track which poll IDs we've already fetched
  const fetchedIdsRef = useRef<Set<number>>(new Set())

  // Get the next batch of poll IDs to fetch (reversed to show newest first)
  const nextBatchPollIds = useMemo(() => {
    if (!allActivePollIds) return []
    // Reverse the array to get newest polls first (highest poll IDs first)
    const reversedIds = [...allActivePollIds].reverse()
    const start = currentPage * pageSize
    const end = start + pageSize
    return reversedIds.slice(start, end).filter(id => !fetchedIdsRef.current.has(id))
  }, [allActivePollIds, currentPage, pageSize])

  // Build multicall config for getPoll (only for new polls)
  const pollCalls = useMemo(() => {
    if (!contractAddress || nextBatchPollIds.length === 0) return []

    return nextBatchPollIds.map((id) => ({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: 'getPoll' as const,
      args: [BigInt(id)],
    }))
  }, [nextBatchPollIds, contractAddress])

  // Build multicall config for hasUserVoted (only for new polls)
  const votedCalls = useMemo(() => {
    if (!contractAddress || !userAddress || nextBatchPollIds.length === 0) return []

    return nextBatchPollIds.map((id) => ({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: 'hasUserVoted' as const,
      args: [BigInt(id), userAddress],
    }))
  }, [nextBatchPollIds, contractAddress, userAddress])

  // Fetch poll data using multicall
  const {
    data: pollsData,
    isLoading: pollsLoading,
    error: pollsError,
    refetch: refetchPolls,
  } = useReadContracts({
    contracts: pollCalls,
    query: {
      enabled: pollCalls.length > 0,
    },
  })

  // Fetch voting status using multicall
  const { data: votedData, isLoading: votedLoading } = useReadContracts({
    contracts: votedCalls,
    query: {
      enabled: votedCalls.length > 0 && !!userAddress,
    },
  })

  // Transform new batch of contract data to FormattedPoll format
  const transformPollData = useCallback((
    pollResult: any,
    votedResult: any,
    pollId: number
  ): FormattedPoll | null => {
    if (pollResult.status !== 'success' || !pollResult.result) return null

    const pollData = pollResult.result as any[]

    // Extract poll fields from contract response
    const [
      id,
      question,
      options,
      votes,
      endTime,
      isActive,
      creator,
      totalFunding,
      distributionMode,
      fundingToken,
      fundingType,
      contractStatus,
      previousStatus,
      votingType,
      totalVotesBought,
    ] = pollData

    // Calculate total votes
    const votesArray = votes as bigint[]
    const totalVotes = votesArray.reduce(
      (sum: number, vote: bigint) => sum + Number(vote),
      0
    )

    // Determine funding type string
    let fundingTypeString: 'none' | 'self' | 'community'
    if (fundingType === FundingType.NONE) {
      fundingTypeString = 'none'
    } else if (fundingType === FundingType.SELF) {
      fundingTypeString = 'self'
    } else {
      fundingTypeString = 'community'
    }

    // Get token symbol
    const tokenSymbol = getTokenSymbol(chainId, fundingToken as Address) || 'ETH'

    // Get correct decimals for the funding token (USDC=6, ETH/PULSE=18)
    const tokenDecimals = TOKEN_INFO[tokenSymbol]?.decimals || 18

    // Check voting status
    const hasVoted = votedResult?.status === 'success'
      ? (votedResult.result as boolean)
      : false

    // Determine status
    const endTimeMs = Number(endTime) * 1000
    const isEnded = Date.now() >= endTimeMs
    const status: 'active' | 'ended' = isActive && !isEnded ? 'active' : 'ended'

    // Map voting type from contract enum to frontend format
    // VotingType: LINEAR = 0, QUADRATIC = 1
    const votingTypeString: 'standard' | 'quadratic' =
      Number(votingType) === 1 ? 'quadratic' : 'standard'

    // Debug logging
    console.log(`[Contract Poll ${pollId}] Token: ${tokenSymbol}, Decimals: ${tokenDecimals}, Raw totalFunding: ${totalFunding}, Converted: ${Number(totalFunding) / Math.pow(10, tokenDecimals)}, VotingType: ${votingTypeString}`)

    return {
      id: pollId.toString(),
      title: question,
      description: `Poll created by ${creator}`,
      creator: creator as Address,
      createdAt: new Date().toISOString(),
      endsAt: new Date(endTimeMs).toISOString(),
      totalVotes,
      totalReward: Number(totalFunding) / Math.pow(10, tokenDecimals),
      status,
      category: 'General',
      fundingType: fundingTypeString,
      fundingToken: tokenSymbol,
      chainId,
      hasVoted,
      votingType: votingTypeString,
      options: (options as string[]).map((option: string, optIndex: number) => ({
        id: `${pollId}-${optIndex}`,
        text: option,
        votes: Number(votesArray[optIndex]),
        percentage:
          totalVotes > 0
            ? Math.round((Number(votesArray[optIndex]) / totalVotes) * 100)
            : 0,
      })),
    }
  }, [chainId])

  // Effect to append new polls when data arrives
  useEffect(() => {
    if (!pollsData || pollsData.length === 0 || nextBatchPollIds.length === 0) return
    if (pollsLoading || votedLoading) return

    const newPolls: FormattedPoll[] = []

    pollsData.forEach((result, index) => {
      const pollId = nextBatchPollIds[index]
      if (fetchedIdsRef.current.has(pollId)) return

      const poll = transformPollData(result, votedData?.[index], pollId)
      if (poll) {
        newPolls.push(poll)
        fetchedIdsRef.current.add(pollId)
      }
    })

    if (newPolls.length > 0) {
      setAccumulatedPolls(prev => [...prev, ...newPolls])
      setIsLoadingMore(false)
    }
  }, [pollsData, votedData, nextBatchPollIds, pollsLoading, votedLoading, transformPollData])

  // Load more polls - just increment page, effect will handle fetching
  const loadMore = useCallback(() => {
    setIsLoadingMore(true)
    setCurrentPage(prev => prev + 1)
  }, [])

  // Refetch all data - reset state and refetch
  const refetch = useCallback(() => {
    fetchedIdsRef.current.clear()
    setAccumulatedPolls([])
    setCurrentPage(0)
    setIsLoadingMore(false)
    refetchIds()
    refetchPolls()
  }, [refetchIds, refetchPolls])

  // Refetch a single poll by ID and update it in the accumulated polls
  const refetchPoll = useCallback(async (pollId: number) => {
    if (!contractAddress) return

    try {
      // Use viem's readContract directly for a single poll fetch
      const { readContract } = await import('viem/actions')
      const { getPublicClient } = await import('wagmi/actions')
      const { config } = await import('@/lib/wagmi')

      const publicClient = getPublicClient(config, { chainId })
      if (!publicClient) return

      // Fetch the poll data
      const pollData = await readContract(publicClient, {
        address: contractAddress,
        abi: POLLS_CONTRACT_ABI,
        functionName: 'getPoll',
        args: [BigInt(pollId)],
      }) as any[]

      // Fetch hasUserVoted if user is connected
      let hasVoted = false
      if (userAddress) {
        hasVoted = await readContract(publicClient, {
          address: contractAddress,
          abi: POLLS_CONTRACT_ABI,
          functionName: 'hasUserVoted',
          args: [BigInt(pollId), userAddress],
        }) as boolean
      }

      // Extract poll fields from contract response
      const [
        id,
        question,
        options,
        votes,
        endTime,
        isActive,
        creator,
        totalFunding,
        distributionMode,
        fundingToken,
        fundingType,
        contractStatus,
        previousStatus,
        votingType,
        totalVotesBought,
      ] = pollData

      // Calculate total votes
      const votesArray = votes as bigint[]
      const totalVotes = votesArray.reduce(
        (sum: number, vote: bigint) => sum + Number(vote),
        0
      )

      // Determine funding type string
      let fundingTypeString: 'none' | 'self' | 'community'
      if (fundingType === FundingType.NONE) {
        fundingTypeString = 'none'
      } else if (fundingType === FundingType.SELF) {
        fundingTypeString = 'self'
      } else {
        fundingTypeString = 'community'
      }

      // Get token symbol
      const tokenSymbol = getTokenSymbol(chainId, fundingToken as Address) || 'ETH'

      // Get correct decimals for the funding token (USDC=6, ETH/PULSE=18)
      const tokenDecimals = TOKEN_INFO[tokenSymbol]?.decimals || 18

      // Determine status
      const endTimeMs = Number(endTime) * 1000
      const isEnded = Date.now() >= endTimeMs
      const status: 'active' | 'ended' = isActive && !isEnded ? 'active' : 'ended'

      // Map voting type from contract enum to frontend format
      // VotingType: LINEAR = 0, QUADRATIC = 1
      const votingTypeString: 'standard' | 'quadratic' =
        Number(votingType) === 1 ? 'quadratic' : 'standard'

      // Debug logging for refetch
      console.log(`[Contract RefetchPoll ${pollId}] Token: ${tokenSymbol}, Decimals: ${tokenDecimals}, Raw totalFunding: ${totalFunding}, Converted: ${Number(totalFunding) / Math.pow(10, tokenDecimals)}, VotingType: ${votingTypeString}`)

      const updatedPoll: FormattedPoll = {
        id: pollId.toString(),
        title: question,
        description: `Poll created by ${creator}`,
        creator: creator as Address,
        createdAt: new Date().toISOString(),
        endsAt: new Date(endTimeMs).toISOString(),
        totalVotes,
        totalReward: Number(totalFunding) / Math.pow(10, tokenDecimals),
        status,
        category: 'General',
        fundingType: fundingTypeString,
        fundingToken: tokenSymbol,
        chainId,
        hasVoted,
        votingType: votingTypeString,
        options: (options as string[]).map((option: string, optIndex: number) => ({
          id: `${pollId}-${optIndex}`,
          text: option,
          votes: Number(votesArray[optIndex]),
          percentage:
            totalVotes > 0
              ? Math.round((Number(votesArray[optIndex]) / totalVotes) * 100)
              : 0,
        })),
      }

      // Update the poll in accumulated polls
      setAccumulatedPolls(prev =>
        prev.map(poll => poll.id === pollId.toString() ? updatedPoll : poll)
      )
    } catch (error) {
      console.error('Failed to refetch poll:', error)
    }
  }, [contractAddress, chainId, userAddress])

  // Calculate hasMore
  const totalPolls = allActivePollIds?.length || 0
  const hasMore = accumulatedPolls.length < totalPolls

  // Initial loading (no polls yet)
  const isInitialLoading = idsLoading || (accumulatedPolls.length === 0 && (pollsLoading || votedLoading))

  return {
    polls: accumulatedPolls,
    loading: isInitialLoading,
    loadingMore: isLoadingMore && (pollsLoading || votedLoading),
    error: idsError || pollsError || null,
    hasMore,
    loadMore,
    refetch,
    refetchPoll,
    totalCount: totalPolls,
  }
}
