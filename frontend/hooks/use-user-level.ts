'use client'

/**
 * Hook to fetch user's XP and level info
 */

import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import {
  fetchUserLevel,
  fetchXpLeaderboard,
  fetchLevelThresholds,
  UserLevel,
  LevelThreshold,
} from '@/lib/api/quests-client'

/**
 * Hook to fetch user's XP and level
 */
export function useUserLevel() {
  const { address, isConnected } = useAccount()

  return useQuery<UserLevel, Error>({
    queryKey: ['user-level', address],
    queryFn: () => fetchUserLevel(address!),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch XP leaderboard
 */
export function useXpLeaderboard(limit: number = 10, offset: number = 0) {
  return useQuery({
    queryKey: ['xp-leaderboard', limit, offset],
    queryFn: () => fetchXpLeaderboard(limit, offset),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch level thresholds
 */
export function useLevelThresholds() {
  return useQuery<LevelThreshold[], Error>({
    queryKey: ['level-thresholds'],
    queryFn: fetchLevelThresholds,
    staleTime: 60 * 60 * 1000, // 1 hour - rarely changes
  })
}

/**
 * Calculate level progress percentage
 */
export function useLevelProgress() {
  const { data: userLevel } = useUserLevel()
  const { data: thresholds } = useLevelThresholds()

  if (!userLevel || !thresholds) {
    return {
      percentage: 0,
      currentXp: 0,
      requiredXp: 100,
      level: 1,
      title: 'Novice',
    }
  }

  const currentThreshold = thresholds.find(t => t.level === userLevel.level)
  const nextThreshold = thresholds.find(t => t.level === userLevel.level + 1)

  if (!nextThreshold) {
    // Max level reached
    return {
      percentage: 100,
      currentXp: userLevel.totalXp,
      requiredXp: userLevel.totalXp,
      level: userLevel.level,
      title: currentThreshold?.title || 'Legend',
    }
  }

  const currentLevelXp = currentThreshold?.xpRequired || 0
  const xpInCurrentLevel = userLevel.totalXp - currentLevelXp
  const xpRequiredForNextLevel = nextThreshold.xpRequired - currentLevelXp
  const percentage = Math.min(100, (xpInCurrentLevel / xpRequiredForNextLevel) * 100)

  return {
    percentage,
    currentXp: xpInCurrentLevel,
    requiredXp: xpRequiredForNextLevel,
    level: userLevel.level,
    title: currentThreshold?.title || 'Unknown',
  }
}
