/**
 * Questionnaires API Client
 * API endpoints for managing questionnaires and poll groupings
 */

import { apiClient, handleAPIError } from './client'

// Types
export type QuestionnaireStatus = 'draft' | 'active' | 'closed' | 'archived'

export interface QuestionnaireSettings {
  allowPartialCompletion?: boolean
  showProgressBar?: boolean
  shuffleOrder?: boolean
  requireAllPolls?: boolean
}

export interface PollRewardDistribution {
  pollId: string
  chainId: number
  percentage: number
}

export interface Questionnaire {
  id: string
  onChainId: string
  creatorAddress: string
  chainId: number
  title: string
  description: string | null
  category: string | null
  tags: string[] | null
  startTime: string | null
  endTime: string | null
  totalRewardAmount: string
  fundingToken: string
  rewardDistribution: PollRewardDistribution[] | null
  settings: QuestionnaireSettings | null
  status: QuestionnaireStatus
  pollCount: number
  completionCount: number
  createdAt: string
  updatedAt: string
}

export interface QuestionnairePoll {
  chainId: number
  pollId: number
  sortOrder: number
  rewardPercentage: string | null
  source: 'new' | 'existing'
  addedAt: string
}

export interface QuestionnaireWithPolls extends Questionnaire {
  polls: QuestionnairePoll[]
}

export interface QuestionnaireProgress {
  started: boolean
  pollsAnswered: string[]
  isComplete: boolean
  completedAt: string | null
  startedAt?: string
  updatedAt?: string
}

export interface CreateQuestionnaireInput {
  creatorAddress: string
  chainId: number
  title: string
  description?: string
  category?: string
  tags?: string[]
  startTime?: string
  endTime?: string
  totalRewardAmount?: string
  fundingToken?: string
  settings?: QuestionnaireSettings
}

export interface UpdateQuestionnaireInput {
  title?: string
  description?: string
  category?: string
  tags?: string[]
  startTime?: string
  endTime?: string
  totalRewardAmount?: string
  fundingToken?: string
  rewardDistribution?: PollRewardDistribution[]
  settings?: QuestionnaireSettings
  status?: QuestionnaireStatus
}

export interface AddPollInput {
  chainId: number
  pollId: number
  sortOrder?: number
  rewardPercentage?: string
  source?: 'new' | 'existing'
}

export interface PollOrderUpdate {
  chainId: number
  pollId: number
  sortOrder: number
}

export interface RewardDistributionUpdate {
  chainId: number
  pollId: number
  percentage: string
}

// API Functions

/**
 * Create a new questionnaire
 */
export async function createQuestionnaire(input: CreateQuestionnaireInput): Promise<Questionnaire> {
  try {
    const response = await apiClient.post('/api/questionnaires', input)
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get all questionnaires for a creator
 */
export async function fetchQuestionnaires(
  creatorAddress: string,
  chainId?: number,
  status?: QuestionnaireStatus
): Promise<Questionnaire[]> {
  try {
    const params: Record<string, string> = { creatorAddress }
    if (chainId) params.chainId = String(chainId)
    if (status) params.status = status
    const response = await apiClient.get('/api/questionnaires', { params })
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get all active questionnaires (for participants)
 */
export async function fetchActiveQuestionnaires(
  chainId?: number,
  limit?: number,
  offset?: number
): Promise<Questionnaire[]> {
  try {
    const params: Record<string, string> = {}
    if (chainId) params.chainId = String(chainId)
    if (limit) params.limit = String(limit)
    if (offset) params.offset = String(offset)
    const response = await apiClient.get('/api/questionnaires', { params })
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get a questionnaire by ID
 */
export async function fetchQuestionnaireById(
  id: string,
  includePolls = false
): Promise<Questionnaire | QuestionnaireWithPolls> {
  try {
    const params = includePolls ? { includePolls: 'true' } : {}
    const response = await apiClient.get(`/api/questionnaires/${id}`, { params })
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get a questionnaire by on-chain ID
 */
export async function fetchQuestionnaireByOnChainId(
  chainId: number,
  onChainId: number
): Promise<Questionnaire> {
  try {
    const response = await apiClient.get(`/api/questionnaires/chain/${chainId}/${onChainId}`)
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Update a questionnaire
 */
export async function updateQuestionnaire(
  id: string,
  creatorAddress: string,
  input: UpdateQuestionnaireInput
): Promise<Questionnaire> {
  try {
    const response = await apiClient.put(`/api/questionnaires/${id}`, input, {
      params: { creatorAddress },
    })
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Archive a questionnaire (soft delete)
 */
export async function archiveQuestionnaire(id: string, creatorAddress: string): Promise<void> {
  try {
    await apiClient.delete(`/api/questionnaires/${id}`, {
      params: { creatorAddress },
    })
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Permanently delete a questionnaire
 */
export async function deleteQuestionnaire(id: string, creatorAddress: string): Promise<void> {
  try {
    await apiClient.delete(`/api/questionnaires/${id}`, {
      params: { creatorAddress, permanent: 'true' },
    })
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Add a poll to a questionnaire
 */
export async function addPollToQuestionnaire(questionnaireId: string, input: AddPollInput): Promise<void> {
  try {
    await apiClient.post(`/api/questionnaires/${questionnaireId}/polls`, input)
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Remove a poll from a questionnaire
 */
export async function removePollFromQuestionnaire(
  questionnaireId: string,
  chainId: number,
  pollId: number
): Promise<void> {
  try {
    await apiClient.delete(`/api/questionnaires/${questionnaireId}/polls/${chainId}/${pollId}`)
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Update poll order in a questionnaire
 */
export async function updateQuestionnairePollOrder(
  questionnaireId: string,
  polls: PollOrderUpdate[]
): Promise<void> {
  try {
    await apiClient.put(`/api/questionnaires/${questionnaireId}/polls/order`, { polls })
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Update reward distribution for polls in a questionnaire
 */
export async function updateRewardDistribution(
  questionnaireId: string,
  distribution: RewardDistributionUpdate[]
): Promise<void> {
  try {
    await apiClient.put(`/api/questionnaires/${questionnaireId}/rewards`, { distribution })
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Start responding to a questionnaire
 */
export async function startQuestionnaireResponse(
  questionnaireId: string,
  userAddress: string
): Promise<QuestionnaireProgress> {
  try {
    const response = await apiClient.post(`/api/questionnaires/${questionnaireId}/respond`, {
      userAddress,
    })
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Update progress on a questionnaire
 */
export async function updateQuestionnaireProgress(
  questionnaireId: string,
  userAddress: string,
  pollId: string
): Promise<QuestionnaireProgress> {
  try {
    const response = await apiClient.put(`/api/questionnaires/${questionnaireId}/respond`, {
      userAddress,
      pollId,
    })
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get user's progress on a questionnaire
 */
export async function fetchQuestionnaireProgress(
  questionnaireId: string,
  userAddress: string
): Promise<QuestionnaireProgress> {
  try {
    const response = await apiClient.get(
      `/api/questionnaires/${questionnaireId}/progress/${userAddress}`
    )
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get all questionnaire responses for a user
 */
export async function fetchUserQuestionnaireResponses(userAddress: string): Promise<QuestionnaireProgress[]> {
  try {
    const response = await apiClient.get(`/api/questionnaires/user/${userAddress}`)
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

// Poll in questionnaire info
export interface PollInQuestionnaire {
  chainId: number
  pollId: number
  questionnaireId: string
  questionnaireTitle: string
}

/**
 * Get all polls that are in questionnaires for a creator
 */
export async function fetchPollsInQuestionnaires(
  creatorAddress: string,
  chainId: number,
  excludeQuestionnaireId?: string
): Promise<PollInQuestionnaire[]> {
  try {
    const params: Record<string, string> = {
      creatorAddress,
      chainId: String(chainId),
    }
    if (excludeQuestionnaireId) {
      params.excludeQuestionnaireId = excludeQuestionnaireId
    }
    const response = await apiClient.get('/api/questionnaires/polls-in-questionnaires', { params })
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}
