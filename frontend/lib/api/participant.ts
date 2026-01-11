/**
 * Participant API Client
 * Functions to fetch participant rewards and claim data
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface ParticipantReward {
  pollId: bigint
  question: string
  isActive: boolean
  endTime: bigint
  totalFunding: bigint
  claimableAmount: string
  totalParticipants: number
}

export interface ParticipantStats {
  totalClaimable: string
  pollsParticipated: number
  totalClaimed: string
  pendingClaims: number
}

export interface ClaimHistoryItem {
  id: string
  pollId: bigint
  pollQuestion: string
  amount: string
  convertedTo: string
  status: 'completed' | 'processing' | 'failed'
  timestamp: Date
  txHash?: string
}

/**
 * Fetch all claimable rewards for a user
 */
export async function fetchParticipantRewards(
  address: string,
  chainId: number
): Promise<ParticipantReward[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/participant/rewards?address=${address}&chainId=${chainId}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch participant rewards')
    }

    const data = await response.json()
    return data.rewards || []
  } catch (error) {
    console.error('Error fetching participant rewards:', error)
    // Return empty array for now (API might not be implemented yet)
    return []
  }
}

/**
 * Fetch participant statistics
 */
export async function fetchParticipantStats(
  address: string,
  chainId: number
): Promise<ParticipantStats> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/participant/stats?address=${address}&chainId=${chainId}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch participant stats')
    }

    const data = await response.json()
    return data.stats
  } catch (error) {
    console.error('Error fetching participant stats:', error)
    // Return default stats for now
    return {
      totalClaimable: '0.00 ETH',
      pollsParticipated: 0,
      totalClaimed: '0.00 ETH',
      pendingClaims: 0,
    }
  }
}

/**
 * Fetch claim history for a user
 */
export async function fetchClaimHistory(
  address: string,
  chainId: number
): Promise<ClaimHistoryItem[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/participant/claims?address=${address}&chainId=${chainId}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch claim history')
    }

    const data = await response.json()

    // Convert timestamp strings to Date objects
    return (data.claims || []).map((claim: any) => ({
      ...claim,
      timestamp: new Date(claim.timestamp),
      pollId: BigInt(claim.pollId),
    }))
  } catch (error) {
    console.error('Error fetching claim history:', error)
    // Return empty array for now
    return []
  }
}

/**
 * Estimate user's claimable reward for a specific poll
 */
export async function estimateUserReward(
  pollId: bigint,
  userAddress: string,
  chainId: number
): Promise<string> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/participant/estimate?pollId=${pollId}&address=${userAddress}&chainId=${chainId}`
    )

    if (!response.ok) {
      throw new Error('Failed to estimate reward')
    }

    const data = await response.json()
    return data.estimatedReward || '0.00'
  } catch (error) {
    console.error('Error estimating reward:', error)
    return '0.00'
  }
}
