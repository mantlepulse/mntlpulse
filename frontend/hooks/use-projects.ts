'use client'

/**
 * Hooks for creator projects
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import {
  fetchProjects,
  fetchProjectById,
  fetchProjectStats,
  fetchProjectPolls,
  fetchProjectInsights,
  fetchProjectsByPoll,
  createProject,
  updateProject,
  archiveProject,
  deleteProject,
  addPollToProject,
  removePollFromProject,
  updatePollOrder,
  Project,
  ProjectWithPolls,
  ProjectStatus,
  CreateProjectInput,
  UpdateProjectInput,
  AddPollInput,
  PollOrderUpdate,
  CreatorProjectStats,
  ProjectPoll,
  ProjectInsight,
} from '@/lib/api/projects-client'

/**
 * Hook to fetch all projects for the connected creator
 */
export function useCreatorProjects(status?: ProjectStatus) {
  const { address, isConnected } = useAccount()

  return useQuery<Project[], Error>({
    queryKey: ['creator-projects', address, status],
    queryFn: () => fetchProjects(address!, status),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch project stats for creator dashboard
 */
export function useCreatorProjectStats() {
  const { address, isConnected } = useAccount()

  return useQuery<CreatorProjectStats, Error>({
    queryKey: ['creator-project-stats', address],
    queryFn: () => fetchProjectStats(address!),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch a specific project by ID
 */
export function useProject(id: string | undefined, includePolls = false) {
  return useQuery<Project | ProjectWithPolls, Error>({
    queryKey: ['project', id, includePolls],
    queryFn: () => fetchProjectById(id!, includePolls),
    enabled: !!id,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch polls in a project
 */
export function useProjectPolls(projectId: string | undefined) {
  return useQuery<ProjectPoll[], Error>({
    queryKey: ['project-polls', projectId],
    queryFn: () => fetchProjectPolls(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to fetch project insights
 */
export function useProjectInsights(projectId: string | undefined, insightType?: string) {
  return useQuery<ProjectInsight[], Error>({
    queryKey: ['project-insights', projectId, insightType],
    queryFn: () => fetchProjectInsights(projectId!, insightType),
    enabled: !!projectId,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch projects containing a specific poll
 */
export function useProjectsByPoll(chainId: number | undefined, pollId: string | undefined) {
  return useQuery<Project[], Error>({
    queryKey: ['projects-by-poll', chainId, pollId],
    queryFn: () => fetchProjectsByPoll(chainId!, pollId!),
    enabled: !!chainId && !!pollId,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to create a new project
 */
export function useCreateProject() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<Project, Error, Omit<CreateProjectInput, 'creatorAddress'>>({
    mutationFn: (input) => {
      if (!address) throw new Error('Wallet not connected')
      return createProject({ ...input, creatorAddress: address })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-projects'] })
      queryClient.invalidateQueries({ queryKey: ['creator-project-stats'] })
    },
  })
}

/**
 * Hook to update a project
 */
export function useUpdateProject() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<Project, Error, { id: string } & UpdateProjectInput>({
    mutationFn: ({ id, ...input }) => {
      if (!address) throw new Error('Wallet not connected')
      return updateProject(id, address, input)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creator-projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['creator-project-stats'] })
    },
  })
}

/**
 * Hook to archive a project
 */
export function useArchiveProject() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (id) => {
      if (!address) throw new Error('Wallet not connected')
      return archiveProject(id, address)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-projects'] })
      queryClient.invalidateQueries({ queryKey: ['creator-project-stats'] })
    },
  })
}

/**
 * Hook to permanently delete a project
 */
export function useDeleteProject() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (id) => {
      if (!address) throw new Error('Wallet not connected')
      return deleteProject(id, address)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-projects'] })
      queryClient.invalidateQueries({ queryKey: ['creator-project-stats'] })
    },
  })
}

/**
 * Hook to add a poll to a project
 */
export function useAddPollToProject() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { projectId: string } & AddPollInput>({
    mutationFn: ({ projectId, ...input }) => addPollToProject(projectId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-polls', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['creator-projects'] })
      queryClient.invalidateQueries({ queryKey: ['creator-project-stats'] })
      queryClient.invalidateQueries({ queryKey: ['projects-by-poll', variables.chainId, variables.pollId] })
    },
  })
}

/**
 * Hook to remove a poll from a project
 */
export function useRemovePollFromProject() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { projectId: string; chainId: number; pollId: string }>({
    mutationFn: ({ projectId, chainId, pollId }) => removePollFromProject(projectId, chainId, pollId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-polls', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['creator-projects'] })
      queryClient.invalidateQueries({ queryKey: ['creator-project-stats'] })
      queryClient.invalidateQueries({ queryKey: ['projects-by-poll', variables.chainId, variables.pollId] })
    },
  })
}

/**
 * Hook to update poll order in a project
 */
export function useUpdatePollOrder() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { projectId: string; polls: PollOrderUpdate[] }>({
    mutationFn: ({ projectId, polls }) => updatePollOrder(projectId, polls),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-polls', variables.projectId] })
    },
  })
}
