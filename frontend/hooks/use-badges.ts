'use client'

/**
 * Hook to fetch badges
 */

import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import {
  fetchBadges,
  fetchUserBadges,
  Badge,
  UserBadge,
} from '@/lib/api/quests-client'

/**
 * Hook to fetch all badge definitions
 */
export function useBadges() {
  return useQuery<Badge[], Error>({
    queryKey: ['badges'],
    queryFn: fetchBadges,
    staleTime: 60 * 60 * 1000, // 1 hour - badges rarely change
  })
}

/**
 * Hook to fetch user's earned badges
 */
export function useUserBadges() {
  const { address, isConnected } = useAccount()

  return useQuery<UserBadge[], Error>({
    queryKey: ['user-badges', address],
    queryFn: () => fetchUserBadges(address!),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Group badges by rarity
 */
export function useBadgesByRarity() {
  const { data: badges, ...rest } = useUserBadges()

  const grouped = badges?.reduce(
    (acc, badge) => {
      const rarity = badge.rarity
      if (!acc[rarity]) {
        acc[rarity] = []
      }
      acc[rarity].push(badge)
      return acc
    },
    {} as Record<string, UserBadge[]>
  )

  return {
    data: grouped,
    badges,
    ...rest,
  }
}
