'use client'

/**
 * Hooks for creator-defined quests
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import {
  fetchAvailableQuests,
  fetchCreatorQuests,
  fetchParticipantQuests,
  fetchQuestById,
  fetchQuestParticipants,
  createQuest,
  updateQuest,
  deleteQuest,
  deactivateQuest,
  updateQuestProgress,
  CreatorQuest,
  CreatorQuestWithParticipation,
  CreatorQuestParticipation,
  CreateQuestInput,
  UpdateQuestInput,
} from '@/lib/api/creator-quests-client'

/**
 * Hook to fetch all available quests (optionally with participant progress)
 */
export function useAvailableQuests(includeProgress = false) {
  const { address, isConnected } = useAccount()

  return useQuery<CreatorQuestWithParticipation[], Error>({
    queryKey: ['available-creator-quests', includeProgress ? address : null],
    queryFn: () => fetchAvailableQuests(includeProgress && address ? address : undefined),
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch creator's own quests
 */
export function useCreatorQuests() {
  const { address, isConnected } = useAccount()

  return useQuery<CreatorQuest[], Error>({
    queryKey: ['creator-quests', address],
    queryFn: () => fetchCreatorQuests(address!),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch participant's quests with progress
 */
export function useParticipantQuests() {
  const { address, isConnected } = useAccount()

  return useQuery<Array<{ participation: CreatorQuestParticipation; quest: CreatorQuest }>, Error>({
    queryKey: ['participant-quests', address],
    queryFn: () => fetchParticipantQuests(address!),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch a specific quest by ID
 */
export function useQuestById(id: string | undefined) {
  return useQuery<CreatorQuest, Error>({
    queryKey: ['creator-quest', id],
    queryFn: () => fetchQuestById(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch quest participants
 */
export function useQuestParticipants(questId: string | undefined, completed?: boolean) {
  return useQuery<CreatorQuestParticipation[], Error>({
    queryKey: ['quest-participants', questId, completed],
    queryFn: () => fetchQuestParticipants(questId!, completed),
    enabled: !!questId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to create a new quest
 */
export function useCreateQuest() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<CreatorQuest, Error, Omit<CreateQuestInput, 'creatorAddress'>>({
    mutationFn: (input) => {
      if (!address) throw new Error('Wallet not connected')
      return createQuest({ ...input, creatorAddress: address })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-quests'] })
      queryClient.invalidateQueries({ queryKey: ['available-creator-quests'] })
    },
  })
}

/**
 * Hook to update a quest
 */
export function useUpdateQuest() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<CreatorQuest, Error, { id: string } & Omit<UpdateQuestInput, 'creatorAddress'>>({
    mutationFn: ({ id, ...input }) => {
      if (!address) throw new Error('Wallet not connected')
      return updateQuest(id, { ...input, creatorAddress: address })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creator-quests'] })
      queryClient.invalidateQueries({ queryKey: ['creator-quest', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['available-creator-quests'] })
    },
  })
}

/**
 * Hook to delete a quest
 */
export function useDeleteQuest() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (id) => {
      if (!address) throw new Error('Wallet not connected')
      return deleteQuest(id, address)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-quests'] })
      queryClient.invalidateQueries({ queryKey: ['available-creator-quests'] })
    },
  })
}

/**
 * Hook to deactivate a quest
 */
export function useDeactivateQuest() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<CreatorQuest, Error, string>({
    mutationFn: (id) => {
      if (!address) throw new Error('Wallet not connected')
      return deactivateQuest(id, address)
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['creator-quests'] })
      queryClient.invalidateQueries({ queryKey: ['creator-quest', id] })
      queryClient.invalidateQueries({ queryKey: ['available-creator-quests'] })
    },
  })
}

/**
 * Hook to update quest progress
 */
export function useUpdateQuestProgress() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<
    { updated: boolean; completed?: boolean; pointsAwarded?: number; reason?: string },
    Error,
    { questId: string; progress?: number; increment?: boolean }
  >({
    mutationFn: ({ questId, progress, increment }) => {
      if (!address) throw new Error('Wallet not connected')
      return updateQuestProgress(questId, address, { progress, increment })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participant-quests'] })
      queryClient.invalidateQueries({ queryKey: ['available-creator-quests'] })
      queryClient.invalidateQueries({ queryKey: ['user-season-points'] })
      queryClient.invalidateQueries({ queryKey: ['points-history'] })
    },
  })
}
