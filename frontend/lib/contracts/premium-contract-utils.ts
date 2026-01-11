import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useChainId, useAccount } from 'wagmi'
import { parseUnits, formatUnits, Address } from 'viem'
import {
  PREMIUM_CONTRACT_ABI,
  PREMIUM_CONTRACT_ADDRESSES,
  PREMIUM_FUNCTIONS,
  Subscription,
  SubscriptionTier,
  TIER_NAMES,
} from './premium-contract'
import { getContractAddress, SupportedChainId } from './contract-config'
import { ERC20_ABI } from './token-config'

// Custom hook to get premium contract address for current chain
export const usePremiumContractAddress = (): Address | undefined => {
  const chainId = useChainId() as SupportedChainId
  return PREMIUM_CONTRACT_ADDRESSES[chainId]
}

// Custom hook to get PULSE token address for current chain
export const usePulseTokenAddress = (): Address | undefined => {
  const chainId = useChainId()
  return getContractAddress(chainId, 'PULSE_TOKEN') as Address | undefined
}

// ============ Read Hooks ============

// Hook to check if user is premium through subscription
export const useIsPremium = (userAddress?: Address) => {
  const contractAddress = usePremiumContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: PREMIUM_CONTRACT_ABI,
    functionName: PREMIUM_FUNCTIONS.IS_PREMIUM,
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

// Hook to check if user is premium through subscription OR staking
export const useIsPremiumOrStaked = (userAddress?: Address) => {
  const contractAddress = usePremiumContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: PREMIUM_CONTRACT_ABI,
    functionName: PREMIUM_FUNCTIONS.IS_PREMIUM_OR_STAKED,
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

// Hook to get subscription details
export const useSubscription = (userAddress?: Address) => {
  const contractAddress = usePremiumContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: PREMIUM_CONTRACT_ABI,
    functionName: PREMIUM_FUNCTIONS.GET_SUBSCRIPTION,
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

// Hook to get tier price
export const useTierPrice = (tier: SubscriptionTier) => {
  const contractAddress = usePremiumContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: PREMIUM_CONTRACT_ABI,
    functionName: PREMIUM_FUNCTIONS.GET_TIER_PRICE,
    args: [tier],
    query: {
      enabled: !!contractAddress && tier !== SubscriptionTier.NONE,
    },
  })
}

// Hook to get all tier prices
export const useAllTierPrices = () => {
  const contractAddress = usePremiumContractAddress()

  const { data: monthlyPrice } = useReadContract({
    address: contractAddress,
    abi: PREMIUM_CONTRACT_ABI,
    functionName: PREMIUM_FUNCTIONS.GET_TIER_PRICE,
    args: [SubscriptionTier.MONTHLY],
    query: { enabled: !!contractAddress },
  })

  const { data: annualPrice } = useReadContract({
    address: contractAddress,
    abi: PREMIUM_CONTRACT_ABI,
    functionName: PREMIUM_FUNCTIONS.GET_TIER_PRICE,
    args: [SubscriptionTier.ANNUAL],
    query: { enabled: !!contractAddress },
  })

  const { data: lifetimePrice } = useReadContract({
    address: contractAddress,
    abi: PREMIUM_CONTRACT_ABI,
    functionName: PREMIUM_FUNCTIONS.GET_TIER_PRICE,
    args: [SubscriptionTier.LIFETIME],
    query: { enabled: !!contractAddress },
  })

  return {
    [SubscriptionTier.MONTHLY]: monthlyPrice as bigint | undefined,
    [SubscriptionTier.ANNUAL]: annualPrice as bigint | undefined,
    [SubscriptionTier.LIFETIME]: lifetimePrice as bigint | undefined,
  }
}

// Hook to get time remaining on subscription
export const useTimeRemaining = (userAddress?: Address) => {
  const contractAddress = usePremiumContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: PREMIUM_CONTRACT_ABI,
    functionName: PREMIUM_FUNCTIONS.GET_TIME_REMAINING,
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

// Hook to get total revenue
export const useTotalRevenue = () => {
  const contractAddress = usePremiumContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: PREMIUM_CONTRACT_ABI,
    functionName: PREMIUM_FUNCTIONS.TOTAL_REVENUE,
    query: {
      enabled: !!contractAddress,
    },
  })
}

// Hook to get total subscribers
export const useTotalSubscribers = () => {
  const contractAddress = usePremiumContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: PREMIUM_CONTRACT_ABI,
    functionName: PREMIUM_FUNCTIONS.TOTAL_SUBSCRIBERS,
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

// Hook to get PULSE token allowance for premium contract
export const usePulseAllowanceForPremium = (ownerAddress?: Address) => {
  const pulseToken = usePulseTokenAddress()
  const premiumContract = usePremiumContractAddress()

  return useReadContract({
    address: pulseToken,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: ownerAddress && premiumContract ? [ownerAddress, premiumContract] : undefined,
    query: {
      enabled: !!pulseToken && !!ownerAddress && !!premiumContract,
    },
  })
}

// ============ Write Hooks ============

// Hook to approve PULSE for premium contract
export const useApprovePulseForPremium = () => {
  const pulseToken = usePulseTokenAddress()
  const premiumContract = usePremiumContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const approve = async (amount: string, decimals: number = 18) => {
    if (!pulseToken || !premiumContract) return

    const parsedAmount = parseUnits(amount, decimals)

    return writeContract({
      address: pulseToken,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [premiumContract, parsedAmount],
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

// Hook to subscribe
export const useSubscribe = () => {
  const contractAddress = usePremiumContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const subscribe = async (tier: SubscriptionTier) => {
    if (!contractAddress || tier === SubscriptionTier.NONE) return

    return writeContract({
      address: contractAddress,
      abi: PREMIUM_CONTRACT_ABI,
      functionName: PREMIUM_FUNCTIONS.SUBSCRIBE,
      args: [tier],
    })
  }

  return {
    subscribe,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to extend subscription
export const useExtendSubscription = () => {
  const contractAddress = usePremiumContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const extendSubscription = async (tier: SubscriptionTier) => {
    if (!contractAddress || tier === SubscriptionTier.NONE) return

    return writeContract({
      address: contractAddress,
      abi: PREMIUM_CONTRACT_ABI,
      functionName: PREMIUM_FUNCTIONS.EXTEND_SUBSCRIPTION,
      args: [tier],
    })
  }

  return {
    extendSubscription,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// ============ Helper Functions ============

// Format subscription from contract response
export const formatSubscription = (data: any): Subscription | null => {
  if (!data) return null

  const [tier, expirationTime, isActive, purchaseTime, totalPaid] = data

  return {
    tier,
    expirationTime,
    isActive,
    purchaseTime,
    totalPaid,
  }
}

// Format PULSE amount for display
export const formatPulseAmount = (amount: bigint, decimals: number = 18): string => {
  return formatUnits(amount, decimals)
}

// Get tier name
export const getTierName = (tier: SubscriptionTier): string => {
  return TIER_NAMES[tier] || 'Unknown'
}

// Format time remaining
export const formatTimeRemaining = (seconds: bigint): string => {
  if (seconds === BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')) {
    return 'Lifetime'
  }

  const numSeconds = Number(seconds)
  if (numSeconds <= 0) return 'Expired'

  const days = Math.floor(numSeconds / 86400)
  const hours = Math.floor((numSeconds % 86400) / 3600)

  if (days > 30) {
    const months = Math.floor(days / 30)
    return `${months} month${months > 1 ? 's' : ''}`
  }

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`
  }

  return `${hours} hour${hours > 1 ? 's' : ''}`
}

// Combined hook for user's complete premium status
export const useUserPremiumStatus = () => {
  const { address } = useAccount()

  const { data: subscription, isLoading: subscriptionLoading } = useSubscription(address)
  const { data: isPremiumOrStaked, isLoading: premiumLoading } = useIsPremiumOrStaked(address)
  const { data: timeRemaining, isLoading: timeLoading } = useTimeRemaining(address)
  const { data: pulseBalance, isLoading: balanceLoading } = usePulseBalance(address)
  const tierPrices = useAllTierPrices()

  const formattedSubscription = formatSubscription(subscription)

  return {
    subscription: formattedSubscription,
    isPremiumOrStaked: isPremiumOrStaked as boolean | undefined,
    timeRemaining: timeRemaining as bigint | undefined,
    pulseBalance: pulseBalance as bigint | undefined,
    tierPrices,
    isLoading: subscriptionLoading || premiumLoading || timeLoading || balanceLoading,
  }
}
