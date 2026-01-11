'use client'

/**
 * Hook to fetch closed polls for a creator directly from the contract
 * This serves as a fallback when the subgraph is not available or still indexing
 */

import { useEffect, useState, useMemo } from 'react'
import { useReadContract, useReadContracts } from 'wagmi'
import { Address } from 'viem'
import { POLLS_CONTRACT_ABI, POLLS_CONTRACT_ADDRESSES, SupportedChainId } from '@/lib/contracts/polls-contract'
import { getTokenSymbol } from '@/lib/contracts/token-config'
import type { CreatorPoll } from './use-creator-dashboard-data'

interface UseClosedPollsContractReturn {
  polls: CreatorPoll[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useClosedPollsContract(
  creatorAddress: string | undefined,
  chainId: number
): UseClosedPollsContractReturn {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const contractAddress = POLLS_CONTRACT_ADDRESSES[chainId as SupportedChainId]

  // First, get the total number of polls
  const { data: nextPollId, refetch: refetchNextPollId } = useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: 'nextPollId',
    query: {
      enabled: isClient && !!contractAddress,
    },
  })

  // Create an array of poll IDs to fetch
  const pollIds = useMemo(() => {
    if (!nextPollId) return []
    const count = Number(nextPollId)
    // Limit to last 100 polls to avoid too many calls
    const startId = Math.max(0, count - 100)
    return Array.from({ length: count - startId }, (_, i) => BigInt(startId + i))
  }, [nextPollId])

  // Batch read all polls using multicall
  const { data: pollsData, isLoading, error, refetch: refetchPolls } = useReadContracts({
    contracts: pollIds.map((pollId) => ({
      address: contractAddress!,
      abi: POLLS_CONTRACT_ABI,
      functionName: 'getPoll',
      args: [pollId],
    })) as any,
    query: {
      enabled: isClient && !!contractAddress && pollIds.length > 0,
    },
  })

  // Filter and transform polls
  const closedPolls = useMemo(() => {
    if (!pollsData || !creatorAddress) return []

    const result: CreatorPoll[] = []

    pollsData.forEach((pollResult, index) => {
      if (pollResult.status !== 'success' || !pollResult.result) return

      const poll = pollResult.result as [
        bigint,  // id
        string,  // question
        string[], // options
        bigint[], // votes
        bigint,  // endTime
        boolean, // isActive
        Address, // creator
        bigint,  // totalFunding
        number,  // distributionMode
        Address, // fundingToken
        number,  // fundingType
        number,  // status
        number,  // previousStatus
        number,  // votingType
        bigint,  // totalVotesBought
        bigint   // questionnaireId
      ]

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
        status,
        _previousStatus,
        votingType,
        totalVotesBought,
        _questionnaireId
      ] = poll

      // Filter: only closed polls created by the user
      if (isActive) return
      if (creator.toLowerCase() !== creatorAddress.toLowerCase()) return

      const totalVotes = votes.reduce((sum, v) => sum + v, BigInt(0))

      result.push({
        id: id.toString(),
        pollId: Number(id),
        question,
        options,
        votes,
        totalVotes: Number(totalVotes),
        endTime: Number(endTime),
        isActive,
        totalFunding,
        totalFundingAmount: totalFunding,
        voteCount: votes.reduce((sum, v) => sum + Number(v), 0),
        voterCount: 0, // Not available from contract
        distributionMode: distributionMode as 0 | 1 | 2,
        fundingType: (['none', 'self', 'community'] as const)[fundingType] || 'none',
        status: (['active', 'closed', 'for_claiming', 'paused'] as const)[status] || 'closed',
        createdAt: new Date(), // Not available from contract
        fundingToken,
        fundingTokenSymbol: getTokenSymbol(chainId, fundingToken) || 'ETH',
      })
    })

    // Sort by endTime descending (most recently closed first)
    return result.sort((a, b) => b.endTime - a.endTime)
  }, [pollsData, creatorAddress, chainId])

  const refetch = () => {
    refetchNextPollId()
    refetchPolls()
  }

  return {
    polls: closedPolls,
    loading: isLoading,
    error: error || null,
    refetch,
  }
}
