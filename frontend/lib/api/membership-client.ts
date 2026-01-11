/**
 * Membership API Client
 * API endpoints for membership tiers and daily vote limits
 */

import { apiClient, handleAPIError } from './client'

// Types
export interface TierRequirements {
  pollsParticipated: number
  totalVotes: number
  pollsCreated: number
  seasonsCompleted: number
}

export interface MembershipTier {
  id: string
  slug: string
  name: string
  dailyVoteLimit: number
  maxSeasonPoints: number
  requirements: TierRequirements
  displayOrder: number
  createdAt: string
}

export interface UserMembershipStats {
  pollsParticipated: number
  totalVotesCast: number
  pollsCreated: number
  seasonsCompleted: number
}

export interface UserMembership {
  address: string
  currentTier: string
  tierName: string
  tierUpdatedAt: string
  stats: UserMembershipStats
}

export interface VoteLimitInfo {
  tier: string
  tierName: string
  todayVotes: number
  dailyLimit: number
  remaining: number
  canVote: boolean
}

// API Functions

/**
 * Get all membership tier definitions
 */
export async function fetchMembershipTiers(): Promise<MembershipTier[]> {
  try {
    const response = await apiClient.get('/api/membership/tiers')
    return response.data.tiers
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get user's current membership status with tier details
 */
export async function fetchUserMembership(address: string): Promise<{
  membership: UserMembership
  tier: MembershipTier | null
}> {
  try {
    const response = await apiClient.get(`/api/membership/${address}`)
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Recalculate and update user's tier based on their activity
 */
export async function checkUserTier(address: string): Promise<{
  membership: Pick<UserMembership, 'address' | 'currentTier' | 'tierName' | 'tierUpdatedAt'>
}> {
  try {
    const response = await apiClient.post(`/api/membership/${address}/check`)
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get user's daily vote count and remaining votes
 */
export async function fetchVoteLimitInfo(address: string): Promise<VoteLimitInfo> {
  try {
    const response = await apiClient.get(`/api/membership/${address}/daily-votes`)
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Record a vote (increments daily count)
 */
export async function recordVote(address: string): Promise<{
  success: boolean
  remaining: number
  limit: number
}> {
  try {
    const response = await apiClient.post(`/api/membership/${address}/vote`)
    return response.data
  } catch (error) {
    throw new Error(handleAPIError(error))
  }
}

/**
 * Get tier color based on tier slug
 */
export function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
  }
  return colors[tier.toLowerCase()] || colors.bronze
}

/**
 * Get tier badge variant based on tier slug
 */
export function getTierBadgeVariant(tier: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    bronze: 'outline',
    silver: 'secondary',
    gold: 'default',
    platinum: 'destructive',
  }
  return variants[tier.toLowerCase()] || 'outline'
}
