/**
 * Points API Client
 * API endpoints for user points and rewards
 */

import { apiClient, handleAPIError } from './client'

// Types
export type PointsTransactionType = 'quest_reward' | 'bonus' | 'adjustment'

export interface UserSeasonPoints {
  id: string
  address: string
  seasonId: string
  totalPoints: number
  pulseEarned: string
  pulseClaimed: boolean
  claimTxHash: string | null
  createdAt: string
  updatedAt: string
}

export interface PointsTransaction {
  id: string
  address: string
  seasonId: string
  amount: number
  type: PointsTransactionType
  questId: string | null
  description: string | null
  reversedAt: string | null
  reversedBy: string | null
  reversalReason: string | null
  createdAt: string
}

export interface UserPointsTotals {
  totalPoints: number
  seasonCount: number
}

// API Functions

/**
 * Get user's points for a specific season
 */
export async function fetchUserSeasonPoints(
  address: string,
  seasonId: string
): Promise<UserSeasonPoints | null> {
  try {
    const response = await apiClient.get(`/api/points/${address}`, {
      params: { seasonId },
    })
    return response.data.points
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get user's total points across all seasons
 */
export async function fetchUserTotalPoints(address: string): Promise<UserPointsTotals> {
  try {
    const response = await apiClient.get(`/api/points/${address}`)
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get user's points transaction history
 */
export async function fetchPointsHistory(
  address: string,
  options?: { seasonId?: string; limit?: number }
): Promise<PointsTransaction[]> {
  try {
    const params: Record<string, string> = {}
    if (options?.seasonId) params.seasonId = options.seasonId
    if (options?.limit) params.limit = String(options.limit)

    const response = await apiClient.get(`/api/points/${address}/history`, { params })
    return response.data.transactions
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get user's unclaimed PULSE rewards
 */
export async function fetchUnclaimedRewards(address: string): Promise<{
  unclaimed: UserSeasonPoints[]
  totalUnclaimed: string
}> {
  try {
    const response = await apiClient.get(`/api/points/${address}/unclaimed`)
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Mark PULSE as claimed for a season
 */
export async function markPulseClaimed(
  address: string,
  seasonId: string,
  txHash: string
): Promise<UserSeasonPoints> {
  try {
    const response = await apiClient.post(`/api/points/${address}/claim`, {
      seasonId,
      txHash,
    })
    return response.data.points
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}
