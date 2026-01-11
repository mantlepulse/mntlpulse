'use client'

/**
 * Hooks for questionnaires
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccount, useChainId } from 'wagmi'
import {
  fetchQuestionnaires,
  fetchActiveQuestionnaires,
  fetchQuestionnaireById,
  fetchQuestionnaireByOnChainId,
  fetchQuestionnaireProgress,
  fetchUserQuestionnaireResponses,
  fetchPollsInQuestionnaires,
  createQuestionnaire,
  updateQuestionnaire,
  archiveQuestionnaire,
  deleteQuestionnaire,
  addPollToQuestionnaire,
  removePollFromQuestionnaire,
  updateQuestionnairePollOrder,
  updateRewardDistribution,
  startQuestionnaireResponse,
  updateQuestionnaireProgress,
  Questionnaire,
  QuestionnaireWithPolls,
  QuestionnaireStatus,
  QuestionnaireProgress,
  CreateQuestionnaireInput,
  UpdateQuestionnaireInput,
  AddPollInput,
  PollOrderUpdate,
  RewardDistributionUpdate,
  PollInQuestionnaire,
} from '@/lib/api/questionnaires-client'

// Re-export types for convenience
export type {
  Questionnaire,
  QuestionnaireWithPolls,
  QuestionnaireStatus,
  QuestionnaireProgress,
  QuestionnaireSettings,
  QuestionnairePoll,
  PollRewardDistribution,
  CreateQuestionnaireInput,
  UpdateQuestionnaireInput,
  AddPollInput,
  PollOrderUpdate,
  RewardDistributionUpdate,
  PollInQuestionnaire,
} from '@/lib/api/questionnaires-client'

/**
 * Hook to fetch all questionnaires for the connected creator
 */
export function useCreatorQuestionnaires(status?: QuestionnaireStatus) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()

  return useQuery<Questionnaire[], Error>({
    queryKey: ['creator-questionnaires', address, chainId, status],
    queryFn: () => fetchQuestionnaires(address!, chainId, status),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch active questionnaires (for participants)
 */
export function useActiveQuestionnaires(limit?: number, offset?: number) {
  const chainId = useChainId()

  return useQuery<Questionnaire[], Error>({
    queryKey: ['active-questionnaires', chainId, limit, offset],
    queryFn: () => fetchActiveQuestionnaires(chainId, limit, offset),
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch a specific questionnaire by ID
 */
export function useQuestionnaire(id: string | undefined, includePolls = false) {
  return useQuery<Questionnaire | QuestionnaireWithPolls, Error>({
    queryKey: ['questionnaire', id, includePolls],
    queryFn: () => fetchQuestionnaireById(id!, includePolls),
    enabled: !!id,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch a questionnaire by on-chain ID
 */
export function useQuestionnaireByOnChainId(onChainId: number | undefined) {
  const chainId = useChainId()

  return useQuery<Questionnaire, Error>({
    queryKey: ['questionnaire-onchain', chainId, onChainId],
    queryFn: () => fetchQuestionnaireByOnChainId(chainId, onChainId!),
    enabled: !!onChainId,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch user's progress on a questionnaire
 */
export function useQuestionnaireProgress(questionnaireId: string | undefined) {
  const { address, isConnected } = useAccount()

  return useQuery<QuestionnaireProgress, Error>({
    queryKey: ['questionnaire-progress', questionnaireId, address],
    queryFn: () => fetchQuestionnaireProgress(questionnaireId!, address!),
    enabled: isConnected && !!address && !!questionnaireId,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to fetch all questionnaire responses for a user
 */
export function useUserQuestionnaireResponses() {
  const { address, isConnected } = useAccount()

  return useQuery<QuestionnaireProgress[], Error>({
    queryKey: ['user-questionnaire-responses', address],
    queryFn: () => fetchUserQuestionnaireResponses(address!),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to create a new questionnaire
 */
export function useCreateQuestionnaire() {
  const { address } = useAccount()
  const chainId = useChainId()
  const queryClient = useQueryClient()

  return useMutation<Questionnaire, Error, Omit<CreateQuestionnaireInput, 'creatorAddress' | 'chainId'>>({
    mutationFn: (input) => {
      if (!address) throw new Error('Wallet not connected')
      return createQuestionnaire({ ...input, creatorAddress: address, chainId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-questionnaires'] })
      queryClient.invalidateQueries({ queryKey: ['active-questionnaires'] })
    },
  })
}

/**
 * Hook to update a questionnaire
 */
export function useUpdateQuestionnaire() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<Questionnaire, Error, { id: string } & UpdateQuestionnaireInput>({
    mutationFn: ({ id, ...input }) => {
      if (!address) throw new Error('Wallet not connected')
      return updateQuestionnaire(id, address, input)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creator-questionnaires'] })
      queryClient.invalidateQueries({ queryKey: ['questionnaire', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['active-questionnaires'] })
    },
  })
}

/**
 * Hook to archive a questionnaire
 */
export function useArchiveQuestionnaire() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (id) => {
      if (!address) throw new Error('Wallet not connected')
      return archiveQuestionnaire(id, address)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-questionnaires'] })
      queryClient.invalidateQueries({ queryKey: ['active-questionnaires'] })
    },
  })
}

/**
 * Hook to permanently delete a questionnaire
 */
export function useDeleteQuestionnaire() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (id) => {
      if (!address) throw new Error('Wallet not connected')
      return deleteQuestionnaire(id, address)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-questionnaires'] })
      queryClient.invalidateQueries({ queryKey: ['active-questionnaires'] })
    },
  })
}

/**
 * Hook to add a poll to a questionnaire
 */
export function useAddPollToQuestionnaire() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { questionnaireId: string } & AddPollInput>({
    mutationFn: ({ questionnaireId, ...input }) => addPollToQuestionnaire(questionnaireId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire', variables.questionnaireId] })
      queryClient.invalidateQueries({ queryKey: ['creator-questionnaires'] })
    },
  })
}

/**
 * Hook to remove a poll from a questionnaire
 */
export function useRemovePollFromQuestionnaire() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { questionnaireId: string; chainId: number; pollId: number }>({
    mutationFn: ({ questionnaireId, chainId, pollId }) =>
      removePollFromQuestionnaire(questionnaireId, chainId, pollId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire', variables.questionnaireId] })
      queryClient.invalidateQueries({ queryKey: ['creator-questionnaires'] })
    },
  })
}

/**
 * Hook to update poll order in a questionnaire
 */
export function useUpdateQuestionnairePollOrder() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { questionnaireId: string; polls: PollOrderUpdate[] }>({
    mutationFn: ({ questionnaireId, polls }) => updateQuestionnairePollOrder(questionnaireId, polls),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire', variables.questionnaireId] })
    },
  })
}

/**
 * Hook to update reward distribution
 */
export function useUpdateRewardDistribution() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { questionnaireId: string; distribution: RewardDistributionUpdate[] }>({
    mutationFn: ({ questionnaireId, distribution }) => updateRewardDistribution(questionnaireId, distribution),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire', variables.questionnaireId] })
    },
  })
}

/**
 * Hook to start responding to a questionnaire
 */
export function useStartQuestionnaireResponse() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<QuestionnaireProgress, Error, string>({
    mutationFn: (questionnaireId) => {
      if (!address) throw new Error('Wallet not connected')
      return startQuestionnaireResponse(questionnaireId, address)
    },
    onSuccess: (_, questionnaireId) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire-progress', questionnaireId] })
      queryClient.invalidateQueries({ queryKey: ['user-questionnaire-responses'] })
    },
  })
}

/**
 * Hook to update progress on a questionnaire
 */
export function useUpdateQuestionnaireProgress() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<QuestionnaireProgress, Error, { questionnaireId: string; pollId: string }>({
    mutationFn: ({ questionnaireId, pollId }) => {
      if (!address) throw new Error('Wallet not connected')
      return updateQuestionnaireProgress(questionnaireId, address, pollId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire-progress', variables.questionnaireId] })
      queryClient.invalidateQueries({ queryKey: ['user-questionnaire-responses'] })
      queryClient.invalidateQueries({ queryKey: ['questionnaire', variables.questionnaireId] })
    },
  })
}

/**
 * Hook to fetch polls that are already in questionnaires for the connected creator
 * Can exclude a specific questionnaire (useful when editing)
 */
export function usePollsInQuestionnaires(excludeQuestionnaireId?: string) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()

  return useQuery<PollInQuestionnaire[], Error>({
    queryKey: ['polls-in-questionnaires', address, chainId, excludeQuestionnaireId],
    queryFn: () => fetchPollsInQuestionnaires(address!, chainId, excludeQuestionnaireId),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000, // 1 minute
  })
}
