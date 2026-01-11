/**
 * Diagnostic utilities for quadratic voting
 */

import { useReadContract } from 'wagmi'
import { usePollsContractAddress } from './polls-contract-utils'
import { POLLS_CONTRACT_ABI } from './polls-contract'

/**
 * Hook to get the PULSE token address from the contract
 */
export const usePulseTokenFromContract = () => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: 'pulseToken',
    query: {
      enabled: !!contractAddress,
    },
  })
}

/**
 * Hook to get the quadratic voting treasury address from the contract
 */
export const useQuadraticVotingTreasury = () => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: 'quadraticVotingTreasury',
    query: {
      enabled: !!contractAddress,
    },
  })
}

/**
 * Run all diagnostic checks for quadratic voting
 */
export const useQuadraticVotingDiagnostics = () => {
  const { data: pulseToken, isLoading: pulseTokenLoading } = usePulseTokenFromContract()
  const { data: treasury, isLoading: treasuryLoading } = useQuadraticVotingTreasury()

  const isReady =
    pulseToken &&
    pulseToken !== '0x0000000000000000000000000000000000000000' &&
    treasury &&
    treasury !== '0x0000000000000000000000000000000000000000'

  const issues: string[] = []

  if (!pulseToken || pulseToken === '0x0000000000000000000000000000000000000000') {
    issues.push('PULSE token not configured in contract')
  }

  if (!treasury || treasury === '0x0000000000000000000000000000000000000000') {
    issues.push('Quadratic voting treasury not configured in contract')
  }

  return {
    isReady,
    isLoading: pulseTokenLoading || treasuryLoading,
    pulseToken,
    treasury,
    issues,
  }
}
