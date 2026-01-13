/**
 * TypeScript types for The Graph subgraph responses
 */

/**
 * User reference in subgraph (nested entity)
 */
export interface SubgraphUserRef {
  id: string
}

/**
 * Poll entity from subgraph
 */
export interface SubgraphPoll {
  id: string
  pollId?: string
  question: string
  options: string[]
  votes: string[]
  endTime: string
  isActive: boolean
  creator: SubgraphUserRef
  createdAt: string
  totalFundingAmount: string
  status?: 'ACTIVE' | 'CLOSED' | 'FOR_CLAIMING' | 'PAUSED'
  fundingType?: 'NONE' | 'SELF' | 'COMMUNITY'
  votingType: 'LINEAR' | 'QUADRATIC'
  totalVotesBought: string
}

/**
 * Funding entity from subgraph (basic)
 */
export interface SubgraphFunding {
  id: string
  poll: {
    id: string
  }
  funder: SubgraphUserRef
  token: SubgraphToken
  amount: string
  timestamp: string
  transactionHash?: string
}

/**
 * Token entity from subgraph
 */
export interface SubgraphToken {
  id: string
  symbol: string
  decimals: number
}

/**
 * Extended funding entity with full poll details
 */
export interface SubgraphUserFunding {
  id: string
  poll: {
    id: string
    pollId: string
    question: string
    options: string[]
    votes: string[]
    endTime: string
    isActive: boolean
    totalFundingAmount: string
    voteCount: string
    voterCount: string
    status: 'ACTIVE' | 'CLOSED' | 'FOR_CLAIMING' | 'PAUSED'
    fundingType: 'NONE' | 'SELF' | 'COMMUNITY'
  }
  funder: SubgraphUserRef
  token: SubgraphToken
  amount: string
  timestamp: string
  transactionHash: string
}

/**
 * Distribution entity from subgraph
 */
export interface SubgraphDistribution {
  id: string
  poll: {
    id: string
    pollId: string
    question: string
  }
  recipient: {
    id: string
  }
  token: SubgraphToken
  amount: string
  eventType: 'WITHDRAWN' | 'DISTRIBUTED' | 'CLAIMED'
  timestamp: string
  transactionHash: string
}

/**
 * Vote entity from subgraph
 */
export interface SubgraphVote {
  id: string
  poll: {
    id: string
    pollId?: string
    question: string
  }
  voter: SubgraphUserRef
  optionIndex: number
  timestamp: string
  transactionHash?: string
}

/**
 * Global statistics entity
 */
export interface SubgraphGlobalStats {
  totalPolls: string
  totalVotes: string
  totalFunding: string
  totalDistributions: string
  totalUsers: string
  totalVoters: string
  totalFunders: string
  whitelistedTokens: string
}

/**
 * Daily statistics entity
 */
export interface SubgraphDailyStats {
  id: string
  day: string
  dailyPolls: string
  dailyVotes: string
  dailyFunding: string
  dailyDistributions: string
  dailyActiveUsers: string
}

/**
 * Query response types
 */
export interface GetPollResponse {
  poll: SubgraphPoll | null
}

export interface GetPollsResponse {
  polls: SubgraphPoll[]
}

export interface GetGlobalStatsResponse {
  globalStats: SubgraphGlobalStats | null
}

export interface GetDailyStatsResponse {
  dailyStats: SubgraphDailyStats[]
}

export interface GetPollFundingsResponse {
  fundings: SubgraphFunding[]
}

export interface GetUserVotesResponse {
  votes: SubgraphVote[]
}

export interface GetUserFundingsResponse {
  fundings: SubgraphFunding[]
}

export interface GetExtendedUserFundingsResponse {
  fundings: SubgraphUserFunding[]
}

export interface GetUserDistributionsResponse {
  distributions: SubgraphDistribution[]
}

/**
 * Query variables types
 */
export interface PollQueryVariables {
  id: string
}

export interface PollsQueryVariables {
  first?: number
  skip?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
  where?: {
    isActive?: boolean
    creator?: string
    [key: string]: any
  }
}

export interface FundingsQueryVariables {
  pollId: string
  first?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

// Alias for backwards compatibility
export type PollFundingsQueryVariables = FundingsQueryVariables

export interface UserQueryVariables {
  user: string
  first?: number
}

export interface UserDistributionsQueryVariables {
  user: string
  first?: number
}

export interface DailyStatsQueryVariables {
  first?: number
}

/**
 * Simplified funding type for UI
 */
export interface SimplifiedFunding {
  funder: string
  token: string
  amount: number
  timestamp: Date
}

/**
 * User entity from subgraph
 */
export interface SubgraphUser {
  id: string
  address: string
  pollsCreatedCount: number
  totalVotes: number
  pollsParticipated: number
  totalRewards: string
  totalFunded: string
  firstSeenAt: string
  lastSeenAt: string
}

/**
 * Extended poll entity with creator dashboard fields
 */
export interface SubgraphCreatorPoll {
  id: string
  pollId: string
  question: string
  options: string[]
  votes: string[]
  endTime: string
  isActive: boolean
  creator: SubgraphUserRef
  totalFunding: string
  totalFundingAmount: string
  fundingToken?: SubgraphToken
  voteCount: string
  voterCount: string
  distributionMode: 'MANUAL_PULL' | 'MANUAL_PUSH' | 'AUTOMATED'
  fundingType: 'NONE' | 'SELF' | 'COMMUNITY'
  status: 'ACTIVE' | 'CLOSED' | 'FOR_CLAIMING' | 'PAUSED'
  createdAt: string
  votingType: 'LINEAR' | 'QUADRATIC'
  totalVotesBought?: string
}

/**
 * Query response for user stats
 */
export interface GetUserStatsResponse {
  user: SubgraphUser | null
}

/**
 * Query response for polls by creator
 */
export interface GetPollsByCreatorResponse {
  polls: SubgraphCreatorPoll[]
}
