/**
 * Seasons API Client
 * API endpoints for seasons/tournaments
 */

import { apiClient, handleAPIError } from './client'

// Types
export type SeasonStatus = 'upcoming' | 'active' | 'ended' | 'distributed'

export interface Season {
  id: string
  creatorAddress: string
  name: string
  description: string | null
  startTime: string
  endTime: string
  totalPulsePool: string
  pulsePerPoint: string | null
  status: SeasonStatus
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface SeasonLeaderboardEntry {
  address: string
  totalPoints: number
  pulseEarned: string
  pulseClaimed: boolean
}

export interface CreateSeasonInput {
  creatorAddress: string
  name: string
  description?: string
  startTime: string
  endTime: string
  totalPulsePool?: string
  isPublic?: boolean
}

export interface UpdateSeasonInput {
  creatorAddress: string
  name?: string
  description?: string
  startTime?: string
  endTime?: string
  totalPulsePool?: string
  isPublic?: boolean
  status?: SeasonStatus
}

// API Functions

/**
 * Get all seasons with optional filters
 */
export async function fetchSeasons(options?: {
  status?: SeasonStatus
  creator?: string
  isPublic?: boolean
}): Promise<Season[]> {
  try {
    const params: Record<string, string> = {}
    if (options?.status) params.status = options.status
    if (options?.creator) params.creator = options.creator
    if (options?.isPublic !== undefined) params.public = String(options.isPublic)

    const response = await apiClient.get('/api/seasons', { params })
    return response.data.seasons
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get active seasons
 */
export async function fetchActiveSeasons(): Promise<Season[]> {
  try {
    const response = await apiClient.get('/api/seasons/active')
    return response.data.seasons
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get seasons by creator
 */
export async function fetchCreatorSeasons(creatorAddress: string): Promise<Season[]> {
  try {
    const response = await apiClient.get(`/api/seasons/creator/${creatorAddress}`)
    return response.data.seasons
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get season by ID
 */
export async function fetchSeasonById(id: string): Promise<Season> {
  try {
    const response = await apiClient.get(`/api/seasons/${id}`)
    return response.data.season
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get season leaderboard
 */
export async function fetchSeasonLeaderboard(
  seasonId: string,
  limit?: number
): Promise<{
  season: Pick<Season, 'id' | 'name' | 'status' | 'totalPulsePool' | 'pulsePerPoint'>
  leaderboard: SeasonLeaderboardEntry[]
}> {
  try {
    const params = limit ? { limit: String(limit) } : {}
    const response = await apiClient.get(`/api/seasons/${seasonId}/leaderboard`, { params })
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Create a new season
 */
export async function createSeason(input: CreateSeasonInput): Promise<Season> {
  try {
    const response = await apiClient.post('/api/seasons', input)
    return response.data.season
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Update a season
 */
export async function updateSeason(id: string, input: UpdateSeasonInput): Promise<Season> {
  try {
    const response = await apiClient.put(`/api/seasons/${id}`, input)
    return response.data.season
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Delete a season
 */
export async function deleteSeason(id: string, creatorAddress: string): Promise<void> {
  try {
    await apiClient.delete(`/api/seasons/${id}`, {
      data: { creatorAddress },
    })
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Calculate PULSE distribution for an ended season
 */
export async function calculateSeasonDistribution(
  id: string,
  creatorAddress: string
): Promise<{
  pulsePerPoint: string
  totalPoints: number
  totalPool: string
}> {
  try {
    const response = await apiClient.post(`/api/seasons/${id}/calculate-distribution`, {
      creatorAddress,
    })
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Mark a season as distributed
 */
export async function markSeasonDistributed(id: string, creatorAddress: string): Promise<Season> {
  try {
    const response = await apiClient.post(`/api/seasons/${id}/mark-distributed`, {
      creatorAddress,
    })
    return response.data.season
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}
