/**
 * Quests API Client
 * API endpoints for quest system
 */

import { apiClient, handleAPIError } from './client'

// Types
export interface QuestRequirement {
  type: string
  target: number
  timeframe?: 'all_time' | 'daily' | 'weekly' | 'monthly'
}

export interface QuestDefinition {
  id: string
  slug: string
  name: string
  description: string
  category: 'onboarding' | 'engagement' | 'milestone'
  xpReward: number
  badgeId: string | null
  isRecurring: boolean
  recurringPeriod: string | null
  requirements: QuestRequirement
  displayOrder: number
  isActive: boolean
}

export interface QuestProgress {
  progress: number
  target: number
  isCompleted?: boolean
  completedAt?: string | null
}

export interface QuestWithProgress extends QuestDefinition {
  userProgress: QuestProgress | null
}

export interface Badge {
  id: string
  slug: string
  name: string
  description: string
  imageUrl: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  tokenId: string | null
  contractAddress: string | null
}

export interface UserBadge extends Badge {
  earnedAt: string
  claimed: boolean
}

export interface UserLevel {
  address: string
  totalXp: number
  level: number
  currentLevelTitle: string
  nextLevelXp: number | null
  xpToNextLevel: number
}

export interface LevelThreshold {
  level: number
  xpRequired: number
  title: string
}

export interface CheckProgressResult {
  success: boolean
  questsCompleted: string[]
  xpEarned: number
  badgesEarned: string[]
}

// API Functions

/**
 * Get all quest definitions
 */
export async function fetchQuests(category?: string): Promise<QuestDefinition[]> {
  try {
    const params = category ? { category } : {}
    const response = await apiClient.get('/api/quests', { params })
    return response.data.quests
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get user's quest progress for all quests
 */
export async function fetchUserQuestProgress(address: string): Promise<QuestWithProgress[]> {
  try {
    const response = await apiClient.get(`/api/quests/${address}`)
    return response.data.quests
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get user's active (uncompleted) quests
 */
export async function fetchActiveQuests(address: string): Promise<QuestWithProgress[]> {
  try {
    const response = await apiClient.get(`/api/quests/${address}/active`)
    return response.data.quests
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get user's completed quests
 */
export async function fetchCompletedQuests(address: string): Promise<QuestWithProgress[]> {
  try {
    const response = await apiClient.get(`/api/quests/${address}/completed`)
    return response.data.quests
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Trigger quest progress check for a user
 */
export async function checkQuestProgress(address: string): Promise<CheckProgressResult> {
  try {
    const response = await apiClient.post(`/api/quests/${address}/check`)
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get all badges
 */
export async function fetchBadges(): Promise<Badge[]> {
  try {
    const response = await apiClient.get('/api/badges')
    return response.data.badges
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get user's earned badges
 */
export async function fetchUserBadges(address: string): Promise<UserBadge[]> {
  try {
    const response = await apiClient.get(`/api/badges/${address}`)
    return response.data.badges
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get user's XP and level info
 */
export async function fetchUserLevel(address: string): Promise<UserLevel> {
  try {
    const response = await apiClient.get(`/api/levels/${address}`)
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get XP leaderboard
 */
export async function fetchXpLeaderboard(
  limit: number = 10,
  offset: number = 0
): Promise<{
  users: Array<{ address: string; totalXp: number; level: number }>
  meta: { limit: number; offset: number; count: number }
}> {
  try {
    const response = await apiClient.get('/api/levels/leaderboard', {
      params: { limit, offset },
    })
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get level thresholds
 */
export async function fetchLevelThresholds(): Promise<LevelThreshold[]> {
  try {
    const response = await apiClient.get('/api/levels/thresholds')
    return response.data.thresholds
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}
