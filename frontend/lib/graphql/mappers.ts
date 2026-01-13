/**
 * Data mappers to transform subgraph data to frontend types
 */

import { Address } from 'viem'
import type { FormattedPoll, parsePollMetadata } from '@/hooks/use-polls'
import type {
  SubgraphPoll,
  SubgraphFunding,
  SimplifiedFunding,
} from '@/types/subgraph'

/**
 * Get decimals for a token symbol
 * ETH and PULSE have 18 decimals, USDC has 6 decimals
 */
function getTokenDecimals(tokenSymbol?: string): number {
  if (!tokenSymbol) return 18 // Default to ETH decimals
  const symbol = tokenSymbol.toUpperCase()
  if (symbol === 'USDC') return 6
  // ETH, PULSE, and other tokens default to 18 decimals
  return 18
}

/**
 * Parse token metadata from poll question
 * Format: "TITLE|TOKEN:SYMBOL"
 */
function extractPollMetadata(questionWithMetadata: string): { title: string; token?: string } {
  const parts = questionWithMetadata.split('|TOKEN:')
  if (parts.length === 2) {
    return {
      title: parts[0],
      token: parts[1],
    }
  }
  return { title: questionWithMetadata }
}

/**
 * Map a single subgraph poll to FormattedPoll
 */
export function mapSubgraphPollToFormattedPoll(poll: SubgraphPoll): FormattedPoll {
  // Parse metadata from question
  const metadata = extractPollMetadata(poll.question)

  // Calculate total votes
  const totalVotes = poll.votes.reduce((sum, votes) => sum + Number(votes), 0)

  // Map options with vote counts and percentages
  const options = poll.options.map((option, index) => {
    const votes = Number(poll.votes[index])
    const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0

    return {
      id: `${poll.id}-${index}`,
      text: option,
      votes,
      percentage,
    }
  })

  // Determine status from subgraph status field or fallback to isActive + endTime
  const endTimeMs = Number(poll.endTime) * 1000
  const isEnded = Date.now() >= endTimeMs
  let status: 'active' | 'ended' = poll.isActive && !isEnded ? 'active' : 'ended'

  // If subgraph has status field, use it
  if (poll.status) {
    status = poll.status === 'ACTIVE' ? 'active' : 'ended'
  }

  // Determine funding type from subgraph fundingType field or calculate
  const totalFundingNum = Number(poll.totalFundingAmount)
  let fundingType: 'community' | 'self' | 'none' = 'none'

  if (poll.fundingType) {
    fundingType = poll.fundingType === 'COMMUNITY' ? 'community' :
                  poll.fundingType === 'SELF' ? 'self' : 'none'
  } else if (totalFundingNum > 0) {
    fundingType = 'self'
  }

  // Get proper decimals for the funding token
  const decimals = getTokenDecimals(metadata.token)
  const divisor = Math.pow(10, decimals)

  // Map voting type from subgraph enum to frontend format
  const votingType: 'standard' | 'quadratic' =
    poll.votingType === 'QUADRATIC' ? 'quadratic' : 'standard'

  // Extract creator address from nested User entity
  const creatorAddress = poll.creator?.id || poll.creator as unknown as string

  return {
    id: poll.pollId || poll.id,
    title: metadata.title,
    description: '', // Subgraph doesn't store separate description
    creator: creatorAddress as Address,
    createdAt: new Date(Number(poll.createdAt) * 1000).toISOString(),
    endsAt: new Date(endTimeMs).toISOString(),
    totalVotes,
    totalReward: totalFundingNum / divisor, // Convert using proper decimals
    status,
    category: 'General', // Default category, could be enhanced
    fundingType,
    fundingToken: metadata.token,
    options,
    votingType,
  }
}

/**
 * Map multiple subgraph polls to FormattedPoll array
 */
export function mapSubgraphPollsToFormattedPolls(polls: SubgraphPoll[]): FormattedPoll[] {
  return polls.map(mapSubgraphPollToFormattedPoll)
}

/**
 * Map subgraph funding to simplified funding
 */
export function mapSubgraphFundingToSimplified(funding: SubgraphFunding): SimplifiedFunding {
  // Extract funder address from nested User entity
  const funderAddress = typeof funding.funder === 'object' ? funding.funder.id : funding.funder

  // Extract token address from nested Token entity
  const tokenAddress = typeof funding.token === 'object' ? funding.token.id : funding.token

  // Get decimals from token object if available
  const decimals = typeof funding.token === 'object' ? funding.token.decimals : 18
  const divisor = Math.pow(10, decimals)

  return {
    funder: funderAddress,
    token: tokenAddress,
    amount: Number(funding.amount) / divisor,
    timestamp: new Date(Number(funding.timestamp) * 1000),
  }
}

/**
 * Map multiple subgraph fundings to simplified array
 */
export function mapSubgraphFundingsToSimplified(fundings: SubgraphFunding[]): SimplifiedFunding[] {
  return fundings.map(mapSubgraphFundingToSimplified)
}

/**
 * Get token symbol from token address
 */
export function getTokenSymbol(tokenAddress: string): string {
  const address = tokenAddress.toLowerCase()

  // MNT / ETH (zero address)
  if (address === '0x0000000000000000000000000000000000000000') {
    return 'MNT'
  }

  // Mantle Sepolia tokens
  if (address === '0xa3713739c39419aa1c6daf349db4342be59b9142') {
    return 'PULSE'
  }

  // Wrapped MNT on Mantle Sepolia
  if (address === '0xdeaddeaddeaddeaddeaddeaddeaddeaddead1111') {
    return 'WMNT'
  }

  // Unknown token
  return 'TOKEN'
}
