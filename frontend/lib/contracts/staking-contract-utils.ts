import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useChainId, useAccount } from 'wagmi'
import { parseUnits, formatUnits, Address } from 'viem'
import {
  STAKING_CONTRACT_ABI,
  STAKING_CONTRACT_ADDRESSES,
  STAKING_FUNCTIONS,
  StakeInfo,
} from './staking-contract'
import { getContractAddress, SupportedChainId } from './contract-config'
import { ERC20_ABI } from './token-config'

// Custom hook to get staking contract address for current chain
export const useStakingContractAddress = (): Address | undefined => {
  const chainId = useChainId() as SupportedChainId
  return STAKING_CONTRACT_ADDRESSES[chainId]
}

// Custom hook to get PULSE token address for current chain
export const usePulseTokenAddress = (): Address | undefined => {
  const chainId = useChainId()
  return getContractAddress(chainId, 'PULSE_TOKEN') as Address | undefined
}

// Hook to get stake info for a user
export const useStakeInfo = (userAddress?: Address) => {
  const contractAddress = useStakingContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: STAKING_CONTRACT_ABI,
    functionName: STAKING_FUNCTIONS.GET_STAKE_INFO,
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

// Hook to check if user is premium by staking
export const useIsPremiumByStaking = (userAddress?: Address) => {
  const contractAddress = useStakingContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: STAKING_CONTRACT_ABI,
    functionName: STAKING_FUNCTIONS.IS_PREMIUM_BY_STAKING,
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

// Hook to calculate pending rewards
export const usePendingRewards = (userAddress?: Address) => {
  const contractAddress = useStakingContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: STAKING_CONTRACT_ABI,
    functionName: STAKING_FUNCTIONS.CALCULATE_PENDING_REWARDS,
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

// Hook to get total claimable rewards
export const useTotalClaimableRewards = (userAddress?: Address) => {
  const contractAddress = useStakingContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: STAKING_CONTRACT_ABI,
    functionName: STAKING_FUNCTIONS.GET_TOTAL_CLAIMABLE_REWARDS,
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

// Hook to get total staked amount
export const useTotalStaked = () => {
  const contractAddress = useStakingContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: STAKING_CONTRACT_ABI,
    functionName: STAKING_FUNCTIONS.TOTAL_STAKED,
    query: {
      enabled: !!contractAddress,
    },
  })
}

// Hook to get minimum stake for premium
export const useMinimumStakeForPremium = () => {
  const contractAddress = useStakingContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: STAKING_CONTRACT_ABI,
    functionName: STAKING_FUNCTIONS.MINIMUM_STAKE_FOR_PREMIUM,
    query: {
      enabled: !!contractAddress,
    },
  })
}

// Hook to get reward rate per second
export const useRewardRatePerSecond = () => {
  const contractAddress = useStakingContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: STAKING_CONTRACT_ABI,
    functionName: STAKING_FUNCTIONS.REWARD_RATE_PER_SECOND,
    query: {
      enabled: !!contractAddress,
    },
  })
}

// Hook to get reward pool balance
export const useRewardPool = () => {
  const contractAddress = useStakingContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: STAKING_CONTRACT_ABI,
    functionName: STAKING_FUNCTIONS.REWARD_POOL,
    query: {
      enabled: !!contractAddress,
    },
  })
}

// Hook to get PULSE token balance
export const usePulseBalance = (userAddress?: Address) => {
  const pulseToken = usePulseTokenAddress()

  return useReadContract({
    address: pulseToken,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!pulseToken && !!userAddress,
    },
  })
}

// Hook to get PULSE token allowance for staking contract
export const usePulseAllowanceForStaking = (ownerAddress?: Address) => {
  const pulseToken = usePulseTokenAddress()
  const stakingContract = useStakingContractAddress()

  return useReadContract({
    address: pulseToken,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: ownerAddress && stakingContract ? [ownerAddress, stakingContract] : undefined,
    query: {
      enabled: !!pulseToken && !!ownerAddress && !!stakingContract,
    },
  })
}

// ============ Write Hooks ============

// Hook to approve PULSE for staking
export const useApprovePulseForStaking = () => {
  const pulseToken = usePulseTokenAddress()
  const stakingContract = useStakingContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const approve = async (amount: string, decimals: number = 18) => {
    if (!pulseToken || !stakingContract) return

    const parsedAmount = parseUnits(amount, decimals)

    return writeContract({
      address: pulseToken,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [stakingContract, parsedAmount],
    })
  }

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to stake PULSE
export const useStake = () => {
  const contractAddress = useStakingContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const stake = async (amount: string, decimals: number = 18) => {
    if (!contractAddress) return

    const parsedAmount = parseUnits(amount, decimals)

    return writeContract({
      address: contractAddress,
      abi: STAKING_CONTRACT_ABI,
      functionName: STAKING_FUNCTIONS.STAKE,
      args: [parsedAmount],
    })
  }

  return {
    stake,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to unstake PULSE
export const useUnstake = () => {
  const contractAddress = useStakingContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const unstake = async (amount: string, decimals: number = 18) => {
    if (!contractAddress) return

    const parsedAmount = parseUnits(amount, decimals)

    return writeContract({
      address: contractAddress,
      abi: STAKING_CONTRACT_ABI,
      functionName: STAKING_FUNCTIONS.UNSTAKE,
      args: [parsedAmount],
    })
  }

  return {
    unstake,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to claim staking rewards
export const useClaimStakingRewards = () => {
  const contractAddress = useStakingContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const claimRewards = async () => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: STAKING_CONTRACT_ABI,
      functionName: STAKING_FUNCTIONS.CLAIM_REWARDS,
      args: [],
    })
  }

  return {
    claimRewards,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// ============ Helper Functions ============

// Format stake info from contract response
export const formatStakeInfo = (data: any): StakeInfo | null => {
  if (!data) return null

  const [amount, stakingStartTime, lastRewardClaim, accumulatedRewards, pendingRewards] = data

  return {
    amount,
    stakingStartTime,
    lastRewardClaim,
    accumulatedRewards,
    pendingRewards,
  }
}

// Format PULSE amount for display
export const formatPulseAmount = (amount: bigint, decimals: number = 18): string => {
  return formatUnits(amount, decimals)
}

// Calculate APY based on reward rate
export const calculateAPY = (rewardRatePerSecond: bigint, totalStaked: bigint): number => {
  if (totalStaked === 0n) return 0

  // Annual reward = rewardRatePerSecond * seconds in year * staked amount
  const secondsPerYear = BigInt(365 * 24 * 60 * 60)
  const annualReward = rewardRatePerSecond * secondsPerYear

  // APY = (annual reward per token) / 1e18 * 100
  const apy = Number(annualReward) / 1e18 * 100

  return apy
}

// Combined hook for user's complete staking status
export const useUserStakingStatus = () => {
  const { address } = useAccount()

  const { data: stakeInfo, isLoading: stakeInfoLoading } = useStakeInfo(address)
  const { data: isPremium, isLoading: premiumLoading } = useIsPremiumByStaking(address)
  const { data: claimableRewards, isLoading: rewardsLoading } = useTotalClaimableRewards(address)
  const { data: pulseBalance, isLoading: balanceLoading } = usePulseBalance(address)
  const { data: minimumStake } = useMinimumStakeForPremium()

  const formattedStakeInfo = formatStakeInfo(stakeInfo)

  return {
    stakeInfo: formattedStakeInfo,
    isPremium: isPremium as boolean | undefined,
    claimableRewards: claimableRewards as bigint | undefined,
    pulseBalance: pulseBalance as bigint | undefined,
    minimumStake: minimumStake as bigint | undefined,
    isLoading: stakeInfoLoading || premiumLoading || rewardsLoading || balanceLoading,
  }
}
