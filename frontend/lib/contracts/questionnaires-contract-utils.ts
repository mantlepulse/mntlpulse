/**
 * Questionnaires Contract Utils
 * Hooks for contract interactions specific to questionnaires
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { Address } from 'viem'
import {
  POLLS_CONTRACT_ABI,
  FundingType,
  VotingType,
} from './polls-contract'
import { usePollsContractAddress } from './polls-contract-utils'

/**
 * Hook to create a poll within a questionnaire
 * Uses the createPollInQuestionnaire function which includes questionnaireId
 */
export const useCreatePollInQuestionnaire = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  })

  const createPollInQuestionnaire = async (
    question: string,
    options: string[],
    durationInHours: number,
    fundingToken: Address,
    fundingType: FundingType,
    votingType: VotingType,
    questionnaireId: number
  ) => {
    if (!contractAddress) return
    if (questionnaireId <= 0) {
      throw new Error('Questionnaire ID must be greater than 0')
    }

    const durationInSeconds = BigInt(durationInHours * 3600)

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: 'createPollInQuestionnaire',
      args: [
        question,
        options,
        durationInSeconds,
        fundingToken,
        fundingType,
        votingType,
        BigInt(questionnaireId),
      ],
    })
  }

  return {
    createPollInQuestionnaire,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    receipt,
  }
}

/**
 * Hook to get the questionnaire ID for a poll
 * Returns 0 if the poll is standalone (not part of a questionnaire)
 */
export const usePollQuestionnaireId = (pollId: number | undefined) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: 'getPollQuestionnaireId',
    args: pollId !== undefined ? [BigInt(pollId)] : undefined,
    query: {
      enabled: !!contractAddress && pollId !== undefined,
    },
  })
}

/**
 * Hook to check if a poll belongs to a questionnaire
 */
export const useIsPollInQuestionnaire = (pollId: number | undefined) => {
  const { data: questionnaireId, ...rest } = usePollQuestionnaireId(pollId)

  const isInQuestionnaire = questionnaireId !== undefined && questionnaireId !== null
    ? (questionnaireId as bigint) > BigInt(0)
    : undefined

  return {
    ...rest,
    data: isInQuestionnaire,
    questionnaireId,
  }
}
