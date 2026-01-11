'use client'

/**
 * Hooks for user points and rewards
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import {
  fetchUserSeasonPoints,
  fetchUserTotalPoints,
  fetchPointsHistory,
  fetchUnclaimedRewards,
  markPulseClaimed,
  UserSeasonPoints,
  UserPointsTotals,
  PointsTransaction,
} from '@/lib/api/points-client'

/**
 * Hook to fetch user's points for a specific season
 */
export function useUserSeasonPoints(seasonId: string | undefined) {
  const { address, isConnected } = useAccount()

  return useQuery<UserSeasonPoints | null, Error>({
    queryKey: ['user-season-points', address, seasonId],
    queryFn: () => fetchUserSeasonPoints(address!, seasonId!),
    enabled: isConnected && !!address && !!seasonId,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to fetch user's total points across all seasons
 */
export function useUserTotalPoints() {
  const { address, isConnected } = useAccount()

  return useQuery<UserPointsTotals, Error>({
    queryKey: ['user-total-points', address],
    queryFn: () => fetchUserTotalPoints(address!),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch user's points transaction history
 */
export function usePointsHistory(options?: { seasonId?: string; limit?: number }) {
  const { address, isConnected } = useAccount()

  return useQuery<PointsTransaction[], Error>({
    queryKey: ['points-history', address, options],
    queryFn: () => fetchPointsHistory(address!, options),
    enabled: isConnected && !!address,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to fetch user's unclaimed PULSE rewards
 */
export function useUnclaimedRewards() {
  const { address, isConnected } = useAccount()

  return useQuery<{ unclaimed: UserSeasonPoints[]; totalUnclaimed: string }, Error>({
    queryKey: ['unclaimed-rewards', address],
    queryFn: () => fetchUnclaimedRewards(address!),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to mark PULSE as claimed
 */
export function useClaimPulse() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<UserSeasonPoints, Error, { seasonId: string; txHash: string }>({
    mutationFn: ({ seasonId, txHash }) => {
      if (!address) throw new Error('Wallet not connected')
      return markPulseClaimed(address, seasonId, txHash)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unclaimed-rewards'] })
      queryClient.invalidateQueries({ queryKey: ['user-season-points'] })
    },
  })
}
