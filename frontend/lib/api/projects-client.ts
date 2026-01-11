/**
 * Projects API Client
 * API endpoints for managing projects and poll groupings
 */

import { apiClient, handleAPIError } from './client'

// Types
export type ProjectStatus = 'active' | 'completed' | 'archived'

export interface ProjectSettings {
  showVoteBreakdown?: boolean
  showTrends?: boolean
  showParticipantInsights?: boolean
  customLabels?: Record<string, string>
}

export interface Project {
  id: string
  creatorAddress: string
  name: string
  description: string | null
  category: string | null
  tags: string[] | null
  settings: ProjectSettings | null
  status: ProjectStatus
  pollCount: number
  totalVotes: number
  totalFunding: string
  createdAt: string
  updatedAt: string
}

export interface ProjectPoll {
  chainId: number
  pollId: string
  sortOrder: number
  addedAt: string
}

export interface ProjectWithPolls extends Project {
  polls: ProjectPoll[]
}

export interface ProjectInsight {
  insightType: string
  data: Record<string, any>
  generatedAt: string
}

export interface CreateProjectInput {
  creatorAddress: string
  name: string
  description?: string
  category?: string
  tags?: string[]
  settings?: ProjectSettings
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  category?: string
  tags?: string[]
  settings?: ProjectSettings
  status?: ProjectStatus
}

export interface AddPollInput {
  chainId: number
  pollId: string
  sortOrder?: number
}

export interface PollOrderUpdate {
  chainId: number
  pollId: string
  sortOrder: number
}

export interface CreatorProjectStats {
  totalProjects: number
  activeProjects: number
  totalPollsInProjects: number
}

// API Functions

/**
 * Create a new project
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  try {
    const response = await apiClient.post('/api/projects', input)
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get all projects for a creator
 */
export async function fetchProjects(
  creatorAddress: string,
  status?: ProjectStatus
): Promise<Project[]> {
  try {
    const params: Record<string, string> = { creatorAddress }
    if (status) params.status = status
    const response = await apiClient.get('/api/projects', { params })
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get project stats for creator dashboard
 */
export async function fetchProjectStats(creatorAddress: string): Promise<CreatorProjectStats> {
  try {
    const response = await apiClient.get('/api/projects/stats', {
      params: { creatorAddress },
    })
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get a project by ID
 */
export async function fetchProjectById(id: string, includePolls = false): Promise<Project | ProjectWithPolls> {
  try {
    const params = includePolls ? { includePolls: 'true' } : {}
    const response = await apiClient.get(`/api/projects/${id}`, { params })
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Update a project
 */
export async function updateProject(
  id: string,
  creatorAddress: string,
  input: UpdateProjectInput
): Promise<Project> {
  try {
    const response = await apiClient.put(`/api/projects/${id}`, input, {
      params: { creatorAddress },
    })
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Archive a project (soft delete)
 */
export async function archiveProject(id: string, creatorAddress: string): Promise<void> {
  try {
    await apiClient.delete(`/api/projects/${id}`, {
      params: { creatorAddress },
    })
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Permanently delete a project
 */
export async function deleteProject(id: string, creatorAddress: string): Promise<void> {
  try {
    await apiClient.delete(`/api/projects/${id}`, {
      params: { creatorAddress, permanent: 'true' },
    })
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Add a poll to a project
 */
export async function addPollToProject(projectId: string, input: AddPollInput): Promise<void> {
  try {
    await apiClient.post(`/api/projects/${projectId}/polls`, input)
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Remove a poll from a project
 */
export async function removePollFromProject(
  projectId: string,
  chainId: number,
  pollId: string
): Promise<void> {
  try {
    await apiClient.delete(`/api/projects/${projectId}/polls/${chainId}/${pollId}`)
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get polls in a project
 */
export async function fetchProjectPolls(projectId: string): Promise<ProjectPoll[]> {
  try {
    const response = await apiClient.get(`/api/projects/${projectId}/polls`)
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Update poll order in a project
 */
export async function updatePollOrder(projectId: string, polls: PollOrderUpdate[]): Promise<void> {
  try {
    await apiClient.put(`/api/projects/${projectId}/polls/order`, { polls })
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get project insights
 */
export async function fetchProjectInsights(
  projectId: string,
  insightType?: string
): Promise<ProjectInsight[]> {
  try {
    const params = insightType ? { type: insightType } : {}
    const response = await apiClient.get(`/api/projects/${projectId}/insights`, { params })
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get projects containing a specific poll
 */
export async function fetchProjectsByPoll(chainId: number, pollId: string): Promise<Project[]> {
  try {
    const response = await apiClient.get(`/api/projects/by-poll/${chainId}/${pollId}`)
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}
