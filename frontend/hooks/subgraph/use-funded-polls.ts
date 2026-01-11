/**
 * Hook to fetch polls funded by a user with aggregated funding data
 * Aggregates multiple fundings to the same poll into a single entry
 */

'use client'

import { useMemo } from 'react'
import { useUserFundings, type FormattedUserFunding } from './use-user-fundings'

/**
 * Aggregated funded poll for UI display
 */
export interface FundedPoll {
  id: string
  title: string
  status: 'active' | 'ended' | 'cancelled'
  fundedAmount: string
  fundingToken: string
  totalReward: string
  fundingProgress: number
  totalVotes: number
  endsAt: string
  fundedAt: string
  txHash: string
  fundingCount: number
}

/**
 * Aggregate fundings by poll
 */
function aggregateFundingsByPoll(fundings: FormattedUserFunding[]): FundedPoll[] {
  const pollMap = new Map<string, {
    fundings: FormattedUserFunding[]
    totalAmount: number
    firstFundingTime: string
    lastTxHash: string
  }>()

  // Group fundings by poll ID
  for (const funding of fundings) {
    const existing = pollMap.get(funding.pollId)
    if (existing) {
      existing.fundings.push(funding)
      existing.totalAmount += funding.amountFormatted
      // Keep the earliest funding time
      if (new Date(funding.timestamp) < new Date(existing.firstFundingTime)) {
        existing.firstFundingTime = funding.timestamp
      }
      // Keep the latest tx hash
      existing.lastTxHash = funding.transactionHash
    } else {
      pollMap.set(funding.pollId, {
        fundings: [funding],
        totalAmount: funding.amountFormatted,
        firstFundingTime: funding.timestamp,
        lastTxHash: funding.transactionHash,
      })
    }
  }

  // Convert to FundedPoll array
  const fundedPolls: FundedPoll[] = []

  for (const [pollId, data] of pollMap) {
    const firstFunding = data.fundings[0]
    const fundingGoal = firstFunding.pollTotalFunding * 2 || 1 // Estimate goal as 2x current funding
    const fundingProgress = Math.min((firstFunding.pollTotalFunding / fundingGoal) * 100, 100)

    fundedPolls.push({
      id: pollId,
      title: firstFunding.pollTitle,
      status: firstFunding.pollStatus,
      fundedAmount: data.totalAmount.toFixed(4),
      fundingToken: firstFunding.tokenSymbol,
      totalReward: firstFunding.pollTotalFunding.toFixed(4),
      fundingProgress,
      totalVotes: firstFunding.pollTotalVotes,
      endsAt: firstFunding.pollEndTime,
      fundedAt: data.firstFundingTime,
      txHash: data.lastTxHash,
      fundingCount: data.fundings.length,
    })
  }

  // Sort by most recently funded
  fundedPolls.sort((a, b) => new Date(b.fundedAt).getTime() - new Date(a.fundedAt).getTime())

  return fundedPolls
}

export function useFundedPolls(userAddress: string | undefined, chainId: number = 84532, first = 100) {
  const {
    fundings,
    totalFunded,
    fundingCount,
    loading,
    error,
    refetch,
  } = useUserFundings(userAddress, chainId, first)

  // Aggregate fundings by poll
  const fundedPolls = useMemo(() => {
    return aggregateFundingsByPoll(fundings)
  }, [fundings])

  // Calculate stats
  const stats = useMemo(() => {
    return {
      totalFunded,
      totalFundingCount: fundingCount,
      pollsFunded: fundedPolls.length,
      activePolls: fundedPolls.filter(p => p.status === 'active').length,
      completedPolls: fundedPolls.filter(p => p.status === 'ended').length,
      cancelledPolls: fundedPolls.filter(p => p.status === 'cancelled').length,
    }
  }, [fundedPolls, totalFunded, fundingCount])

  return {
    fundedPolls,
    stats,
    loading,
    error,
    refetch,
  }
}
