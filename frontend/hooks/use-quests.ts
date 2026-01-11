'use client'

/**
 * Hook to fetch and manage quests
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import {
  fetchQuests,
  fetchUserQuestProgress,
  fetchActiveQuests,
  fetchCompletedQuests,
  checkQuestProgress,
  QuestDefinition,
  QuestWithProgress,
  CheckProgressResult,
} from '@/lib/api/quests-client'

/**
 * Hook to fetch all quest definitions
 */
export function useQuests(category?: string) {
  return useQuery<QuestDefinition[], Error>({
    queryKey: ['quests', category],
    queryFn: () => fetchQuests(category),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch user's quest progress
 */
export function useUserQuestProgress() {
  const { address, isConnected } = useAccount()

  return useQuery<QuestWithProgress[], Error>({
    queryKey: ['user-quests', address],
    queryFn: () => fetchUserQuestProgress(address!),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch user's active quests
 */
export function useActiveQuests() {
  const { address, isConnected } = useAccount()

  return useQuery<QuestWithProgress[], Error>({
    queryKey: ['active-quests', address],
    queryFn: () => fetchActiveQuests(address!),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch user's completed quests
 */
export function useCompletedQuests() {
  const { address, isConnected } = useAccount()

  return useQuery<QuestWithProgress[], Error>({
    queryKey: ['completed-quests', address],
    queryFn: () => fetchCompletedQuests(address!),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to check and update quest progress
 */
export function useCheckQuestProgress() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<CheckProgressResult, Error>({
    mutationFn: () => {
      if (!address) throw new Error('Wallet not connected')
      return checkQuestProgress(address)
    },
    onSuccess: () => {
      // Invalidate all quest-related queries
      queryClient.invalidateQueries({ queryKey: ['user-quests'] })
      queryClient.invalidateQueries({ queryKey: ['active-quests'] })
      queryClient.invalidateQueries({ queryKey: ['completed-quests'] })
      queryClient.invalidateQueries({ queryKey: ['user-level'] })
      queryClient.invalidateQueries({ queryKey: ['user-badges'] })
    },
  })
}

/**
 * Group quests by category
 */
export function useQuestsByCategory() {
  const { data: quests, ...rest } = useUserQuestProgress()

  const grouped = quests?.reduce(
    (acc, quest) => {
      const category = quest.category as 'onboarding' | 'engagement' | 'milestone'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(quest)
      return acc
    },
    {} as Record<string, QuestWithProgress[]>
  )

  return {
    data: grouped,
    quests,
    ...rest,
  }
}
