/**
 * ZK Verification Contract Utility Hooks
 * React hooks for interacting with the multi-provider ZK Verification smart contract
 * Supports: Reclaim Protocol, Polygon ID, zkPass, World ID
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useChainId, useAccount } from 'wagmi'
import { Address } from 'viem'
import {
  ZK_VERIFICATION_ABI,
  ZK_VERIFICATION_CONTRACT_ADDRESSES,
  ZK_VERIFICATION_FUNCTIONS,
  SocialType,
  ZKProvider,
  ZKVerificationStatus,
  DetailedZKVerificationStatus,
  SOCIAL_TYPE_NAMES,
  ZK_PROVIDER_NAMES,
  providersToBitmask,
  socialTypesToBitmask,
  decodeDetailedStatus,
} from './zk-verification-contract'
import { SupportedChainId } from './contract-config'

// ============ Address Hook ============

/**
 * Get ZK Verification contract address for current chain
 */
export const useZKVerificationContractAddress = (): Address | undefined => {
  const chainId = useChainId() as SupportedChainId
  return ZK_VERIFICATION_CONTRACT_ADDRESSES[chainId]
}

// ============ Read Hooks - Simple (any provider) ============

/**
 * Check if a user has verified a specific social type (with any provider)
 */
export const useIsZKVerified = (userAddress?: Address, socialType?: SocialType) => {
  const contractAddress = useZKVerificationContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.IS_VERIFIED,
    args: userAddress !== undefined && socialType !== undefined
      ? [userAddress, socialType]
      : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress && socialType !== undefined,
    },
  })
}

/**
 * Get verification count for a user (unique social types verified)
 */
export const useZKVerificationCount = (userAddress?: Address) => {
  const contractAddress = useZKVerificationContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.GET_VERIFICATION_COUNT,
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

/**
 * Get voting weight for a user (1 + unique social types verified)
 */
export const useZKVotingWeight = (userAddress?: Address) => {
  const contractAddress = useZKVerificationContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.GET_VOTING_WEIGHT,
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

/**
 * Get full verification status for a user (any provider)
 */
export const useZKVerificationStatus = (userAddress?: Address) => {
  const contractAddress = useZKVerificationContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.GET_VERIFICATION_STATUS,
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

/**
 * Check if a nullifier has been used
 */
export const useIsNullifierUsed = (nullifier?: `0x${string}`) => {
  const contractAddress = useZKVerificationContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.IS_NULLIFIER_USED,
    args: nullifier ? [nullifier] : undefined,
    query: {
      enabled: !!contractAddress && !!nullifier,
    },
  })
}

/**
 * Check if user can access ZK features (premium check)
 */
export const useCanAccessZKFeatures = (userAddress?: Address) => {
  const contractAddress = useZKVerificationContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.CAN_ACCESS_ZK_FEATURES,
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

/**
 * Check if ZK verification feature is enabled
 */
export const useIsZKVerificationEnabled = () => {
  const contractAddress = useZKVerificationContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.VERIFICATION_ENABLED,
    query: {
      enabled: !!contractAddress,
    },
  })
}

/**
 * Get total verifications count
 */
export const useTotalVerifications = () => {
  const contractAddress = useZKVerificationContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.TOTAL_VERIFICATIONS,
    query: {
      enabled: !!contractAddress,
    },
  })
}

// ============ Read Hooks - Provider-specific ============

/**
 * Check if a user has verified a social type with a specific provider
 */
export const useIsVerifiedWithProvider = (
  userAddress?: Address,
  provider?: ZKProvider,
  socialType?: SocialType
) => {
  const contractAddress = useZKVerificationContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.IS_VERIFIED_WITH_PROVIDER,
    args: userAddress !== undefined && provider !== undefined && socialType !== undefined
      ? [userAddress, provider, socialType]
      : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress && provider !== undefined && socialType !== undefined,
    },
  })
}

/**
 * Get verification count for a user with a specific provider
 */
export const useZKVerificationCountByProvider = (userAddress?: Address, provider?: ZKProvider) => {
  const contractAddress = useZKVerificationContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.GET_VERIFICATION_COUNT_BY_PROVIDER,
    args: userAddress !== undefined && provider !== undefined
      ? [userAddress, provider]
      : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress && provider !== undefined,
    },
  })
}

/**
 * Get detailed verification status (packed bitmask)
 */
export const useDetailedVerificationStatus = (userAddress?: Address) => {
  const contractAddress = useZKVerificationContractAddress()

  const result = useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.GET_DETAILED_VERIFICATION_STATUS,
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })

  // Decode the packed status
  const decodedStatus = result.data !== undefined
    ? decodeDetailedStatus(result.data as bigint)
    : null

  return {
    ...result,
    decodedStatus,
  }
}

/**
 * Get which providers a user has used to verify a social type
 */
export const useProvidersForSocialType = (userAddress?: Address, socialType?: SocialType) => {
  const contractAddress = useZKVerificationContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.GET_PROVIDERS_FOR_SOCIAL_TYPE,
    args: userAddress !== undefined && socialType !== undefined
      ? [userAddress, socialType]
      : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress && socialType !== undefined,
    },
  })
}

/**
 * Check if user meets requirements for a poll
 */
export const useMeetsRequirements = (
  userAddress?: Address,
  requiredProviders?: ZKProvider[],
  requiredSocialTypes?: SocialType[]
) => {
  const contractAddress = useZKVerificationContractAddress()

  const providerMask = requiredProviders ? providersToBitmask(requiredProviders) : 0
  const socialMask = requiredSocialTypes ? socialTypesToBitmask(requiredSocialTypes) : 0

  return useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.MEETS_REQUIREMENTS,
    args: userAddress ? [userAddress, providerMask, socialMask] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

/**
 * Check if a provider is enabled
 */
export const useIsProviderEnabled = (provider?: ZKProvider) => {
  const contractAddress = useZKVerificationContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.IS_PROVIDER_ENABLED,
    args: provider !== undefined ? [provider] : undefined,
    query: {
      enabled: !!contractAddress && provider !== undefined,
    },
  })
}

// ============ Write Hooks ============

/**
 * Submit a social account verification with ZK proof (legacy - uses default provider)
 */
export const useVerifySocialAccount = () => {
  const contractAddress = useZKVerificationContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const verifySocialAccount = async (proofBytes: `0x${string}`, socialType: SocialType) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: ZK_VERIFICATION_ABI,
      functionName: ZK_VERIFICATION_FUNCTIONS.VERIFY_SOCIAL_ACCOUNT,
      args: [proofBytes, socialType],
    })
  }

  return {
    verifySocialAccount,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

/**
 * Submit a social account verification with ZK proof for a specific provider
 */
export const useVerifySocialAccountWithProvider = () => {
  const contractAddress = useZKVerificationContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const verifySocialAccountWithProvider = async (
    proofBytes: `0x${string}`,
    provider: ZKProvider,
    socialType: SocialType
  ) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: ZK_VERIFICATION_ABI,
      functionName: ZK_VERIFICATION_FUNCTIONS.VERIFY_SOCIAL_ACCOUNT_WITH_PROVIDER,
      args: [proofBytes, provider, socialType],
    })
  }

  return {
    verifySocialAccountWithProvider,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// ============ Combined Hooks ============

/**
 * Get complete ZK verification status for connected user (any provider)
 */
export const useUserZKStatus = () => {
  const { address } = useAccount()

  const { data: verificationStatus, isLoading: statusLoading } = useZKVerificationStatus(address)
  const { data: votingWeight, isLoading: weightLoading } = useZKVotingWeight(address)
  const { data: canAccess, isLoading: accessLoading } = useCanAccessZKFeatures(address)
  const { data: isEnabled, isLoading: enabledLoading } = useIsZKVerificationEnabled()

  // Format the verification status
  const formattedStatus = formatVerificationStatus(verificationStatus)

  return {
    status: formattedStatus,
    votingWeight: votingWeight as bigint | undefined,
    canAccessZKFeatures: canAccess as boolean | undefined,
    isEnabled: isEnabled as boolean | undefined,
    isLoading: statusLoading || weightLoading || accessLoading || enabledLoading,
  }
}

/**
 * Get detailed ZK verification status with per-provider breakdown
 */
export const useUserDetailedZKStatus = () => {
  const { address } = useAccount()

  const { decodedStatus, isLoading: statusLoading } = useDetailedVerificationStatus(address)
  const { data: votingWeight, isLoading: weightLoading } = useZKVotingWeight(address)
  const { data: canAccess, isLoading: accessLoading } = useCanAccessZKFeatures(address)
  const { data: isEnabled, isLoading: enabledLoading } = useIsZKVerificationEnabled()

  return {
    status: decodedStatus,
    votingWeight: votingWeight as bigint | undefined,
    canAccessZKFeatures: canAccess as boolean | undefined,
    isEnabled: isEnabled as boolean | undefined,
    isLoading: statusLoading || weightLoading || accessLoading || enabledLoading,
  }
}

/**
 * Get all enabled providers
 */
export const useAllProviderStatus = () => {
  const { data: reclaimEnabled } = useIsProviderEnabled(ZKProvider.RECLAIM)
  const { data: polygonIdEnabled } = useIsProviderEnabled(ZKProvider.POLYGON_ID)
  const { data: zkPassEnabled } = useIsProviderEnabled(ZKProvider.ZKPASS)
  const { data: worldIdEnabled } = useIsProviderEnabled(ZKProvider.WORLD_ID)

  return {
    [ZKProvider.RECLAIM]: reclaimEnabled as boolean | undefined,
    [ZKProvider.POLYGON_ID]: polygonIdEnabled as boolean | undefined,
    [ZKProvider.ZKPASS]: zkPassEnabled as boolean | undefined,
    [ZKProvider.WORLD_ID]: worldIdEnabled as boolean | undefined,
  }
}

/**
 * Get provider verifications for all social types
 */
export const useProviderVerifications = (userAddress?: Address, provider?: ZKProvider) => {
  const contractAddress = useZKVerificationContractAddress()

  const { data: twitterVerified } = useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.IS_VERIFIED_WITH_PROVIDER,
    args: userAddress !== undefined && provider !== undefined
      ? [userAddress, provider, SocialType.TWITTER]
      : undefined,
    query: { enabled: !!contractAddress && !!userAddress && provider !== undefined },
  })

  const { data: discordVerified } = useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.IS_VERIFIED_WITH_PROVIDER,
    args: userAddress !== undefined && provider !== undefined
      ? [userAddress, provider, SocialType.DISCORD]
      : undefined,
    query: { enabled: !!contractAddress && !!userAddress && provider !== undefined },
  })

  const { data: githubVerified } = useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.IS_VERIFIED_WITH_PROVIDER,
    args: userAddress !== undefined && provider !== undefined
      ? [userAddress, provider, SocialType.GITHUB]
      : undefined,
    query: { enabled: !!contractAddress && !!userAddress && provider !== undefined },
  })

  const { data: telegramVerified } = useReadContract({
    address: contractAddress,
    abi: ZK_VERIFICATION_ABI,
    functionName: ZK_VERIFICATION_FUNCTIONS.IS_VERIFIED_WITH_PROVIDER,
    args: userAddress !== undefined && provider !== undefined
      ? [userAddress, provider, SocialType.TELEGRAM]
      : undefined,
    query: { enabled: !!contractAddress && !!userAddress && provider !== undefined },
  })

  return {
    twitter: twitterVerified as boolean | undefined,
    discord: discordVerified as boolean | undefined,
    github: githubVerified as boolean | undefined,
    telegram: telegramVerified as boolean | undefined,
  }
}

// ============ Helper Functions ============

/**
 * Format verification status from contract response
 */
export const formatVerificationStatus = (data: any): ZKVerificationStatus | null => {
  if (!data) return null

  const [twitter, discord, github, telegram, count] = data

  return {
    twitter,
    discord,
    github,
    telegram,
    count: Number(count),
  }
}

/**
 * Get social type name
 */
export const getSocialTypeName = (socialType: SocialType): string => {
  return SOCIAL_TYPE_NAMES[socialType] || 'Unknown'
}

/**
 * Get provider name
 */
export const getProviderName = (provider: ZKProvider): string => {
  return ZK_PROVIDER_NAMES[provider] || 'Unknown'
}

/**
 * Format voting weight for display
 */
export const formatVotingWeight = (weight: bigint | undefined): string => {
  if (weight === undefined) return '1x'
  return `${weight.toString()}x`
}

/**
 * Check if contract is deployed (address is not zero)
 */
export const useIsZKContractDeployed = (): boolean => {
  const address = useZKVerificationContractAddress()
  return !!address && address !== '0x0000000000000000000000000000000000000000'
}

// Re-export types and helpers for convenience
export type { SocialType, ZKProvider, ZKVerificationStatus, DetailedZKVerificationStatus }
export {
  SOCIAL_TYPE_NAMES,
  ZK_PROVIDER_NAMES,
  providersToBitmask,
  socialTypesToBitmask,
  decodeDetailedStatus,
}
