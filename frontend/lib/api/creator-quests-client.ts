/**
 * Creator Quests API Client
 * API endpoints for creator-defined quests
 */

import { apiClient, handleAPIError } from './client'

// Types
export type CreatorQuestType = 'participation' | 'engagement_goal'

export type CreatorQuestRequirementType =
  | 'vote_on_polls'
  | 'vote_on_specific_poll'
  | 'share_poll'
  | 'first_n_voters'
  | 'participate_n_polls'

export interface CreatorQuestRequirement {
  type: CreatorQuestRequirementType
  target: number
  pollIds?: string[]
}

export interface CreatorQuest {
  id: string
  creatorAddress: string
  name: string
  description: string
  questType: CreatorQuestType
  requirements: CreatorQuestRequirement
  pointsReward: number
  maxCompletions: number | null
  currentCompletions: number
  pollScope: 'all' | 'specific'
  specificPollIds: string[] | null
  seasonId: string | null
  isActive: boolean
  startTime: string | null
  endTime: string | null
  createdAt: string
  updatedAt: string
}

export interface CreatorQuestParticipation {
  id: string
  questId: string
  participantAddress: string
  progress: number
  target: number
  isCompleted: boolean
  completedAt: string | null
  pointsAwarded: number
  createdAt: string
  updatedAt: string
}

export interface CreatorQuestWithParticipation extends CreatorQuest {
  participation: CreatorQuestParticipation | null
}

export interface CreateQuestInput {
  creatorAddress: string
  name: string
  description: string
  questType: CreatorQuestType
  requirements: CreatorQuestRequirement
  pointsReward: number
  maxCompletions?: number
  pollScope?: 'all' | 'specific'
  specificPollIds?: string[]
  seasonId?: string
  startTime?: string
  endTime?: string
}

export interface UpdateQuestInput {
  creatorAddress: string
  name?: string
  description?: string
  pointsReward?: number
  maxCompletions?: number
  isActive?: boolean
  startTime?: string
  endTime?: string
}

// API Functions

/**
 * Get all available quests (optionally with participant progress)
 */
export async function fetchAvailableQuests(participantAddress?: string): Promise<CreatorQuestWithParticipation[]> {
  try {
    const params = participantAddress ? { participant: participantAddress } : {}
    const response = await apiClient.get('/api/creator-quests', { params })
    return response.data.quests
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get all quests by a creator
 */
export async function fetchCreatorQuests(creatorAddress: string): Promise<CreatorQuest[]> {
  try {
    const response = await apiClient.get(`/api/creator-quests/creator/${creatorAddress}`)
    return response.data.quests
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get participant's quests with progress
 */
export async function fetchParticipantQuests(participantAddress: string): Promise<Array<{
  participation: CreatorQuestParticipation
  quest: CreatorQuest
}>> {
  try {
    const response = await apiClient.get(`/api/creator-quests/participant/${participantAddress}`)
    return response.data.quests
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get quest by ID
 */
export async function fetchQuestById(id: string): Promise<CreatorQuest> {
  try {
    const response = await apiClient.get(`/api/creator-quests/${id}`)
    return response.data.quest
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get quest participants
 */
export async function fetchQuestParticipants(
  questId: string,
  completed?: boolean
): Promise<CreatorQuestParticipation[]> {
  try {
    const params = completed !== undefined ? { completed: String(completed) } : {}
    const response = await apiClient.get(`/api/creator-quests/${questId}/participants`, { params })
    return response.data.participants
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Create a new quest
 */
export async function createQuest(input: CreateQuestInput): Promise<CreatorQuest> {
  try {
    const response = await apiClient.post('/api/creator-quests', input)
    return response.data.quest
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Update a quest
 */
export async function updateQuest(id: string, input: UpdateQuestInput): Promise<CreatorQuest> {
  try {
    const response = await apiClient.put(`/api/creator-quests/${id}`, input)
    return response.data.quest
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Delete a quest
 */
export async function deleteQuest(id: string, creatorAddress: string): Promise<void> {
  try {
    await apiClient.delete(`/api/creator-quests/${id}`, {
      data: { creatorAddress },
    })
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Deactivate a quest
 */
export async function deactivateQuest(id: string, creatorAddress: string): Promise<CreatorQuest> {
  try {
    const response = await apiClient.post(`/api/creator-quests/${id}/deactivate`, {
      creatorAddress,
    })
    return response.data.quest
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Update quest progress for a participant
 */
export async function updateQuestProgress(
  questId: string,
  participantAddress: string,
  options: { progress?: number; increment?: boolean }
): Promise<{
  updated: boolean
  completed?: boolean
  pointsAwarded?: number
  reason?: string
}> {
  try {
    const response = await apiClient.post(`/api/creator-quests/${questId}/progress`, {
      participantAddress,
      ...options,
    })
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}
