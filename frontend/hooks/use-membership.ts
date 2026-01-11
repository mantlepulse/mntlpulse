'use client'

/**
 * Hooks for membership tiers and daily vote limits
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import {
  fetchMembershipTiers,
  fetchUserMembership,
  checkUserTier,
  fetchVoteLimitInfo,
  recordVote,
  MembershipTier,
  UserMembership,
  VoteLimitInfo,
} from '@/lib/api/membership-client'

/**
 * Hook to fetch all membership tier definitions
 */
export function useMembershipTiers() {
  return useQuery<MembershipTier[], Error>({
    queryKey: ['membership-tiers'],
    queryFn: fetchMembershipTiers,
    staleTime: 5 * 60 * 1000, // 5 minutes - tiers don't change often
  })
}

/**
 * Hook to fetch user's current membership status
 */
export function useUserMembership() {
  const { address, isConnected } = useAccount()

  return useQuery<{ membership: UserMembership; tier: MembershipTier | null }, Error>({
    queryKey: ['user-membership', address],
    queryFn: () => fetchUserMembership(address!),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch user's daily vote limit info
 */
export function useVoteLimitInfo() {
  const { address, isConnected } = useAccount()

  return useQuery<VoteLimitInfo, Error>({
    queryKey: ['vote-limit-info', address],
    queryFn: () => fetchVoteLimitInfo(address!),
    enabled: isConnected && !!address,
    staleTime: 30 * 1000, // 30 seconds - vote count can change frequently
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

/**
 * Hook to check and update user's tier
 */
export function useCheckUserTier() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      if (!address) throw new Error('Wallet not connected')
      return checkUserTier(address)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-membership'] })
    },
  })
}

/**
 * Hook to record a vote (for vote limit tracking)
 */
export function useRecordVote() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<{ success: boolean; remaining: number; limit: number }, Error>({
    mutationFn: () => {
      if (!address) throw new Error('Wallet not connected')
      return recordVote(address)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vote-limit-info'] })
      queryClient.invalidateQueries({ queryKey: ['user-membership'] })
    },
  })
}

/**
 * Hook to get tier progress (how close user is to next tier)
 */
export function useTierProgress() {
  const { data: membershipData, isLoading } = useUserMembership()
  const { data: allTiers } = useMembershipTiers()

  if (isLoading || !membershipData || !allTiers) {
    return { isLoading: true, progress: null }
  }

  const { membership, tier } = membershipData
  const currentTierIndex = allTiers.findIndex((t) => t.slug === membership.currentTier)
  const nextTier = allTiers[currentTierIndex + 1]

  if (!nextTier) {
    return {
      isLoading: false,
      progress: {
        currentTier: tier,
        nextTier: null,
        isMaxTier: true,
        requirements: null,
      },
    }
  }

  const requirements = nextTier.requirements
  const stats = membership.stats

  return {
    isLoading: false,
    progress: {
      currentTier: tier,
      nextTier,
      isMaxTier: false,
      requirements: {
        pollsParticipated: {
          current: stats.pollsParticipated,
          required: requirements.pollsParticipated,
          met: stats.pollsParticipated >= requirements.pollsParticipated,
        },
        totalVotes: {
          current: stats.totalVotesCast,
          required: requirements.totalVotes,
          met: stats.totalVotesCast >= requirements.totalVotes,
        },
        pollsCreated: {
          current: stats.pollsCreated,
          required: requirements.pollsCreated,
          met: stats.pollsCreated >= requirements.pollsCreated,
        },
        seasonsCompleted: {
          current: stats.seasonsCompleted,
          required: requirements.seasonsCompleted,
          met: stats.seasonsCompleted >= requirements.seasonsCompleted,
        },
      },
    },
  }
}
