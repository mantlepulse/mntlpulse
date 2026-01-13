import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useChainId } from 'wagmi'
import { parseEther, formatEther, Address, parseUnits } from 'viem'
import {
  POLLS_CONTRACT_ABI,
  POLLS_CONTRACT_ADDRESSES,
  CONTRACT_FUNCTIONS,
  Poll,
  Funding,
  SupportedChainId,
  FundingType,
  VotingType,
} from './polls-contract'
import { ERC20_ABI } from './token-config'

// Custom hook to get contract address for current chain
export const usePollsContractAddress = (): Address | undefined => {
  const chainId = useChainId() as SupportedChainId
  return POLLS_CONTRACT_ADDRESSES[chainId]
}

// Hook to read a single poll
export const usePoll = (pollId: number) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.GET_POLL,
    args: [BigInt(pollId)],
    query: {
      enabled: !!contractAddress,
    },
  })
}

// Hook to read all active polls
export const useActivePolls = () => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.GET_ACTIVE_POLLS,
    query: {
      enabled: !!contractAddress,
      // Always refetch on mount to ensure fresh data after poll creation/changes
      staleTime: 0,
      refetchOnMount: 'always',
    },
  })
}

// Hook to check if user has voted on a poll
export const useHasUserVoted = (pollId: number, userAddress?: Address) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.HAS_USER_VOTED,
    args: [BigInt(pollId), userAddress!],
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

// Hook to get poll fundings
export const usePollFundings = (pollId: number) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.GET_POLL_FUNDINGS,
    args: [BigInt(pollId)],
    query: {
      enabled: !!contractAddress,
    },
  })
}

// Hook to get user's funding amount for a poll
export const useUserFunding = (pollId: number, userAddress?: Address) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.GET_USER_FUNDING,
    args: [BigInt(pollId), userAddress!],
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

// Hook to check if poll is active
export const useIsPollActive = (pollId: number) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.IS_POLL_ACTIVE,
    args: [BigInt(pollId)],
    query: {
      enabled: !!contractAddress,
    },
  })
}

// Hook to get next poll ID
export const useNextPollId = () => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.NEXT_POLL_ID,
    query: {
      enabled: !!contractAddress,
    },
  })
}

// Write contract hooks
export const useCreatePoll = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  })

  const createPoll = async (
    question: string,
    options: string[],
    durationInHours: number,
    fundingToken: Address,
    fundingType: FundingType,
    votingType: VotingType = VotingType.LINEAR,
    publish: boolean = true // New parameter: if true, poll starts as ACTIVE; if false, starts as DRAFT
  ) => {
    if (!contractAddress) return

    const durationInSeconds = BigInt(durationInHours * 3600) // Convert hours to seconds

    // Always use createPollWithVotingTypeAndPublish for full control
    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.CREATE_POLL_WITH_VOTING_TYPE_AND_PUBLISH,
      args: [question, options, durationInSeconds, fundingToken, fundingType, votingType, publish],
    })
  }

  return {
    createPoll,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    receipt,
  }
}

// Hook to read platform fee percentage
export const usePlatformFee = () => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.PLATFORM_FEE_PERCENT,
    query: {
      enabled: !!contractAddress,
    },
  })
}

// Hook to calculate platform fee for a specific amount
export const useCalculatePlatformFee = (amount: bigint) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.CALCULATE_PLATFORM_FEE,
    args: [amount],
    query: {
      enabled: !!contractAddress && amount > BigInt(0),
    },
  })
}

// Hook to get the default claim grace period
export const useDefaultClaimGracePeriod = () => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.GET_DEFAULT_CLAIM_GRACE_PERIOD,
    query: {
      enabled: !!contractAddress,
    },
  })
}

// Hook to set the default claim grace period (admin only)
export const useSetDefaultClaimGracePeriod = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  })

  const setDefaultClaimGracePeriod = async (gracePeriodInSeconds: bigint) => {
    if (!contractAddress) return

    writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.SET_DEFAULT_CLAIM_GRACE_PERIOD,
      args: [gracePeriodInSeconds],
    })
  }

  return {
    setDefaultClaimGracePeriod,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
    receipt,
  }
}

// Hook to get the platform treasury address
export const usePlatformTreasury = () => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.PLATFORM_TREASURY,
    query: {
      enabled: !!contractAddress,
    },
  })
}

// Hook to create a poll with funding in a single transaction
export const useCreatePollWithFunding = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  })

  const createPollWithFunding = async (
    question: string,
    options: string[],
    durationInHours: number,
    fundingToken: Address,
    fundingType: FundingType,
    votingType: VotingType = VotingType.LINEAR,
    publish: boolean = true,
    fundingAmount: bigint, // Total amount including platform fee
    expectedResponses: bigint = BigInt(0), // Expected number of voters
    rewardPerResponse: bigint = BigInt(0) // Reward per voter (in wei)
  ) => {
    if (!contractAddress) return

    const durationInSeconds = BigInt(durationInHours * 3600) // Convert hours to seconds
    const isETH = fundingToken === '0x0000000000000000000000000000000000000000'

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.CREATE_POLL_WITH_FUNDING_AND_PUBLISH,
      args: [question, options, durationInSeconds, fundingToken, fundingType, votingType, publish, fundingAmount, expectedResponses, rewardPerResponse],
      value: isETH ? fundingAmount : BigInt(0),
    })
  }

  return {
    createPollWithFunding,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    receipt,
  }
}

// Hook to vote on a poll
export const useVote = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const vote = async (pollId: number, optionIndex: number) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.VOTE,
      args: [BigInt(pollId), BigInt(optionIndex)],
    })
  }

  return {
    vote,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to fund poll with ETH
export const useFundPollWithETH = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const fundPoll = async (pollId: number, ethAmount: string) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.FUND_POLL_WITH_ETH,
      args: [BigInt(pollId)],
      value: parseEther(ethAmount),
    })
  }

  return {
    fundPoll,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to fund poll with ERC20 token
export const useFundPollWithToken = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const fundPoll = async (pollId: number, tokenAddress: Address, amount: string, decimals: number) => {
    if (!contractAddress) return

    const parsedAmount = parseUnits(amount, decimals)

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.FUND_POLL_WITH_TOKEN,
      args: [BigInt(pollId), tokenAddress, parsedAmount],
    })
  }

  return {
    fundPoll,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to approve ERC20 token spending
export const useTokenApproval = () => {
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const approve = async (tokenAddress: Address, spenderAddress: Address, amount: string, decimals: number) => {
    const parsedAmount = parseUnits(amount, decimals)

    return writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, parsedAmount],
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

// Hook to check ERC20 token balance
export const useTokenBalance = (tokenAddress?: Address, userAddress?: Address) => {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!userAddress,
    },
  })
}

// Hook to check ERC20 token allowance
export const useTokenAllowance = (tokenAddress?: Address, ownerAddress?: Address, spenderAddress?: Address) => {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: ownerAddress && spenderAddress ? [ownerAddress, spenderAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!ownerAddress && !!spenderAddress,
    },
  })
}

// Hook to check if token is whitelisted
export const useIsTokenWhitelisted = (tokenAddress?: Address) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: 'whitelistedTokens',
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!tokenAddress,
    },
  })
}

// Hook to close a poll (only creator or owner)
export const useClosePoll = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const closePoll = async (pollId: number) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.CLOSE_POLL,
      args: [BigInt(pollId)],
    })
  }

  return {
    closePoll,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Helper functions to format contract data
export const formatPollData = (pollData: any): Poll => {
  const [id, question, options, votes, endTime, isActive, creator, totalFunding, distributionMode, fundingToken, fundingType, status, previousStatus, votingType, totalVotesBought] = pollData

  return {
    id,
    question,
    options,
    votes,
    endTime,
    isActive,
    creator,
    totalFunding,
    fundingToken,
    fundingType,
    distributionMode,
    status,
    previousStatus,
    votingType: votingType ?? 0, // Default to LINEAR if not present
    totalVotesBought: totalVotesBought ?? BigInt(0),
  }
}

export const formatFundingData = (fundingData: any[]): Funding[] => {
  return fundingData.map((funding) => ({
    token: funding.token,
    amount: funding.amount,
    funder: funding.funder,
    timestamp: funding.timestamp,
  }))
}

// Helper to convert BigInt to readable format
export const formatVotes = (votes: bigint): number => {
  return Number(votes)
}

export const formatETH = (wei: bigint): string => {
  return formatEther(wei)
}

export const formatTimestamp = (timestamp: bigint): Date => {
  return new Date(Number(timestamp) * 1000)
}

// Hook to set distribution mode
export const useSetDistributionMode = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const setDistributionMode = async (pollId: number, mode: number) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: 'setDistributionMode',
      args: [BigInt(pollId), mode],
    })
  }

  return {
    setDistributionMode,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to withdraw funds from a poll
export const useWithdrawFunds = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const withdrawFunds = async (pollId: number, recipient: Address, tokens: Address[]) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: 'withdrawFunds',
      args: [BigInt(pollId), recipient, tokens],
    })
  }

  return {
    withdrawFunds,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to distribute rewards to multiple recipients
export const useDistributeRewards = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const distributeRewards = async (
    pollId: number,
    token: Address,
    recipients: Address[],
    amounts: bigint[]
  ) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: 'distributeRewards',
      args: [BigInt(pollId), token, recipients, amounts],
    })
  }

  return {
    distributeRewards,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to get poll token balance
export const usePollTokenBalance = (pollId: number, tokenAddress?: Address) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: 'getPollTokenBalance',
    args: tokenAddress ? [BigInt(pollId), tokenAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!tokenAddress,
    },
  })
}

// Hook to set poll status to FOR_CLAIMING
export const useSetForClaiming = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const setForClaiming = async (pollId: number) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.SET_FOR_CLAIMING,
      args: [BigInt(pollId)],
    })
  }

  return {
    setForClaiming,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to pause a poll
export const usePausePoll = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const pausePoll = async (pollId: number) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.PAUSE_POLL,
      args: [BigInt(pollId)],
    })
  }

  return {
    pausePoll,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to resume a paused poll
export const useResumePoll = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const resumePoll = async (pollId: number) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.RESUME_POLL,
      args: [BigInt(pollId)],
    })
  }

  return {
    resumePoll,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to publish a draft poll (DRAFT -> ACTIVE)
export const usePublishPoll = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const publishPoll = async (pollId: number) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.PUBLISH_POLL,
      args: [BigInt(pollId)],
    })
  }

  return {
    publishPoll,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to finalize a poll (FOR_CLAIMING -> FINALIZED)
export const useFinalizePoll = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const finalizePoll = async (pollId: number) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.FINALIZE_POLL,
      args: [BigInt(pollId)],
    })
  }

  return {
    finalizePoll,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to get draft polls for a creator
export const useDraftPolls = (creatorAddress?: string) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress ?? undefined,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.GET_DRAFT_POLLS,
    args: creatorAddress ? [creatorAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!contractAddress && !!creatorAddress,
    },
  })
}

// ============ Quadratic Voting Hooks ============

// Hook to buy votes in a quadratic voting poll
export const useBuyVotes = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const buyVotes = async (pollId: number, optionIndex: number, numVotes: number) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.BUY_VOTES,
      args: [BigInt(pollId), BigInt(optionIndex), BigInt(numVotes)],
    })
  }

  return {
    buyVotes,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to preview vote cost for quadratic voting
export const usePreviewVoteCost = (pollId: number, voterAddress?: Address, numVotes?: number) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.PREVIEW_VOTE_COST,
    args: voterAddress && numVotes !== undefined
      ? [BigInt(pollId), voterAddress, BigInt(numVotes)]
      : undefined,
    query: {
      enabled: !!contractAddress && !!voterAddress && numVotes !== undefined && numVotes > 0,
    },
  })
}

// Hook to get user's votes in a quadratic voting poll
export const useUserVotesInPoll = (pollId: number, voterAddress?: Address) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.GET_USER_VOTES_IN_POLL,
    args: voterAddress ? [BigInt(pollId), voterAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!voterAddress,
    },
  })
}

// Hook to calculate quadratic cost (pure calculation, no blockchain state)
export const useCalculateQuadraticCost = (currentVotes: number, additionalVotes: number) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.CALCULATE_QUADRATIC_COST,
    args: [BigInt(currentVotes), BigInt(additionalVotes)],
    query: {
      enabled: !!contractAddress && additionalVotes > 0,
    },
  })
}

// Helper function to calculate quadratic cost locally (for quick UI previews)
export const calculateQuadraticCostLocal = (currentVotes: number, additionalVotes: number): bigint => {
  let totalCost = BigInt(0)
  for (let i = 1; i <= additionalVotes; i++) {
    const voteNumber = BigInt(currentVotes + i)
    totalCost += voteNumber * voteNumber
  }
  return totalCost * BigInt(1e18) // PULSE has 18 decimals
}

// Format quadratic cost for display
export const formatQuadraticCost = (cost: bigint, decimals: number = 18): string => {
  return formatEther(cost)
}

// ============ Refund System Hooks ============

// Hook to get poll funding breakdown
export const usePollFundingBreakdown = (pollId: number) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.GET_POLL_FUNDING_BREAKDOWN,
    args: [BigInt(pollId)],
    query: {
      enabled: !!contractAddress && pollId >= 0,
      // Always refetch to show latest balance after withdraw/donate
      staleTime: 0,
      refetchOnMount: 'always',
    },
  })
}

// Hook to check if claim period has expired
export const useIsClaimPeriodExpired = (pollId: number) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.IS_CLAIM_PERIOD_EXPIRED,
    args: [BigInt(pollId)],
    query: {
      enabled: !!contractAddress && pollId >= 0,
    },
  })
}

// Hook to donate remaining poll funds to treasury
export const useDonateToTreasury = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const donateToTreasury = async (pollId: number, tokens: Address[]) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.DONATE_TO_TREASURY,
      args: [BigInt(pollId), tokens],
    })
  }

  return {
    donateToTreasury,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to set claim deadline for a poll
export const useSetClaimDeadline = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const setClaimDeadline = async (pollId: number, deadline: bigint) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.SET_CLAIM_DEADLINE,
      args: [BigInt(pollId), deadline],
    })
  }

  return {
    setClaimDeadline,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// ============ Participant Claim Hooks ============

// Hook to check if user has claimed their reward
export const useHasClaimedReward = (pollId: number, userAddress?: Address) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.HAS_CLAIMED_REWARD,
    args: pollId !== undefined && userAddress ? [BigInt(pollId), userAddress] : undefined,
    query: {
      enabled: !!contractAddress && pollId !== undefined && !!userAddress,
    },
  })
}

// Hook to get claimable reward amount for a user
export const useClaimableReward = (pollId: number, userAddress?: Address) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.GET_CLAIMABLE_REWARD,
    args: pollId !== undefined && userAddress ? [BigInt(pollId), userAddress] : undefined,
    query: {
      enabled: !!contractAddress && pollId !== undefined && !!userAddress,
    },
  })
}

// Hook to claim reward to own wallet
export const useClaimReward = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const claimReward = async (pollId: number) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.CLAIM_REWARD,
      args: [BigInt(pollId)],
    })
  }

  return {
    claimReward,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to claim reward to a specific address (for SideShift integration)
export const useClaimRewardTo = () => {
  const contractAddress = usePollsContractAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const claimRewardTo = async (pollId: number, recipient: Address) => {
    if (!contractAddress) return

    return writeContract({
      address: contractAddress,
      abi: POLLS_CONTRACT_ABI,
      functionName: CONTRACT_FUNCTIONS.CLAIM_REWARD_TO,
      args: [BigInt(pollId), recipient],
    })
  }

  return {
    claimRewardTo,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook to get owed rewards (amount locked for voters)
export const useOwedRewards = (pollId: number) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.GET_OWED_REWARDS,
    args: [BigInt(pollId)],
    query: {
      enabled: !!contractAddress && pollId >= 0,
    },
  })
}

// Hook to get withdrawable amount (considering voter rewards protection)
export const useWithdrawableAmount = (pollId: number, tokenAddress?: Address) => {
  const contractAddress = usePollsContractAddress()

  return useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: CONTRACT_FUNCTIONS.GET_WITHDRAWABLE_AMOUNT,
    args: pollId !== undefined && tokenAddress ? [BigInt(pollId), tokenAddress] : undefined,
    query: {
      enabled: !!contractAddress && pollId !== undefined && !!tokenAddress,
    },
  })
}