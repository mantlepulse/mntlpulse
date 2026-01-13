import { Address } from 'viem'
import PollsContractABI from './PollsContract.abi.json'

// ABI is imported directly as an array (not as .abi property)
export const POLLS_CONTRACT_ABI = PollsContractABI as const

import { CONTRACT_ADDRESSES, SUPPORTED_CHAINS, getContractAddress } from './contract-config'

// Contract addresses by chain ID
export const POLLS_CONTRACT_ADDRESSES: Record<number, Address> = Object.fromEntries(
  SUPPORTED_CHAINS.map(chainId => [
    chainId,
    getContractAddress(chainId, 'POLLS_CONTRACT') as Address
  ])
) as Record<number, Address>

export const SUPPORTED_CHAIN_IDS = SUPPORTED_CHAINS

export type SupportedChainId = typeof SUPPORTED_CHAIN_IDS[number]

// Contract function names for type safety
export const CONTRACT_FUNCTIONS = {
  // Read functions
  GET_POLL: 'getPoll',
  GET_ACTIVE_POLLS: 'getActivePolls',
  GET_DRAFT_POLLS: 'getDraftPolls',
  GET_POLL_FUNDINGS: 'getPollFundings',
  HAS_USER_VOTED: 'hasUserVoted',
  GET_USER_FUNDING: 'getUserFunding',
  IS_POLL_ACTIVE: 'isPollActive',
  NEXT_POLL_ID: 'nextPollId',
  GET_VOTING_TYPE: 'getVotingType',
  GET_TOTAL_VOTES_BOUGHT: 'getTotalVotesBought',
  GET_USER_VOTES_IN_POLL: 'getUserVotesInPoll',
  PREVIEW_VOTE_COST: 'previewVoteCost',
  CALCULATE_QUADRATIC_COST: 'calculateQuadraticCost',
  PLATFORM_FEE_PERCENT: 'platformFeePercent',
  PLATFORM_TREASURY: 'platformTreasury',
  CALCULATE_PLATFORM_FEE: 'calculatePlatformFee',
  // Refund system
  GET_POLL_FUNDING_BREAKDOWN: 'getPollFundingBreakdown',
  IS_CLAIM_PERIOD_EXPIRED: 'isClaimPeriodExpired',
  POLL_EXPECTED_RESPONSES: 'pollExpectedResponses',
  POLL_REWARD_PER_RESPONSE: 'pollRewardPerResponse',
  POLL_DISTRIBUTED_AMOUNT: 'pollDistributedAmount',
  POLL_CLAIM_DEADLINE: 'pollClaimDeadline',
  POLL_VOTER_COUNT: 'pollVoterCount',
  // Grace period
  DEFAULT_CLAIM_GRACE_PERIOD: 'defaultClaimGracePeriod',
  GET_DEFAULT_CLAIM_GRACE_PERIOD: 'getDefaultClaimGracePeriod',
  MIN_GRACE_PERIOD: 'MIN_GRACE_PERIOD',
  MAX_GRACE_PERIOD: 'MAX_GRACE_PERIOD',
  // Participant claim functions
  HAS_CLAIMED_REWARD: 'hasClaimedReward',
  GET_CLAIMABLE_REWARD: 'getClaimableReward',
  GET_OWED_REWARDS: 'getOwedRewards',
  GET_WITHDRAWABLE_AMOUNT: 'getWithdrawableAmount',

  // Write functions
  CREATE_POLL: 'createPoll',
  CREATE_POLL_WITH_VOTING_TYPE: 'createPollWithVotingType',
  CREATE_POLL_WITH_VOTING_TYPE_AND_PUBLISH: 'createPollWithVotingTypeAndPublish',
  CREATE_POLL_WITH_FUNDING_AND_PUBLISH: 'createPollWithFundingAndPublish',
  VOTE: 'vote',
  BUY_VOTES: 'buyVotes',
  FUND_POLL_WITH_ETH: 'fundPollWithETH',
  FUND_POLL_WITH_TOKEN: 'fundPollWithToken',
  WITHDRAW_FUNDS: 'withdrawFunds',
  CLOSE_POLL: 'closePoll',
  SET_FOR_CLAIMING: 'setForClaiming',
  PAUSE_POLL: 'pausePoll',
  RESUME_POLL: 'resumePoll',
  PUBLISH_POLL: 'publishPoll',
  FINALIZE_POLL: 'finalizePoll',
  WHITELIST_TOKEN: 'whitelistToken',
  SET_PLATFORM_FEE: 'setPlatformFee',
  SET_PLATFORM_TREASURY: 'setPlatformTreasury',
  // Refund system
  DONATE_TO_TREASURY: 'donateToTreasury',
  SET_CLAIM_DEADLINE: 'setClaimDeadline',
  // Grace period (admin only)
  SET_DEFAULT_CLAIM_GRACE_PERIOD: 'setDefaultClaimGracePeriod',
  // Participant claim functions
  CLAIM_REWARD: 'claimReward',
  CLAIM_REWARD_TO: 'claimRewardTo',
} as const

// Event names for listening to contract events
export const CONTRACT_EVENTS = {
  POLL_CREATED: 'PollCreated',
  VOTED: 'Voted',
  POLL_FUNDED: 'PollFunded',
  TOKEN_WHITELISTED: 'TokenWhitelisted',
  FUNDS_WITHDRAWN: 'FundsWithdrawn',
  VOTES_BOUGHT: 'VotesBought',
  // Refund system
  DONATED_TO_TREASURY: 'DonatedToTreasury',
  CLAIM_DEADLINE_SET: 'ClaimDeadlineSet',
  // Grace period
  DEFAULT_CLAIM_GRACE_PERIOD_SET: 'DefaultClaimGracePeriodSet',
} as const

// Enums based on the smart contract
export enum FundingType {
  NONE = 0,
  SELF = 1,
  COMMUNITY = 2
}

export enum DistributionMode {
  MANUAL_PULL = 0,  // Creator manually withdraws to single address
  MANUAL_PUSH = 1,  // Creator manually distributes to multiple recipients
  AUTOMATED = 2     // System automatically distributes when poll ends
}

export enum PollStatus {
  ACTIVE = 0,        // Accepting votes/funding
  CLOSED = 1,        // Voting ended, awaiting distribution setup
  FOR_CLAIMING = 2,  // Ready for reward distribution
  PAUSED = 3,        // Temporarily suspended
  DRAFT = 4,         // Created but not yet published
  FINALIZED = 5      // All distributions complete, poll archived
}

export enum VotingType {
  LINEAR = 0,        // One person, one vote (default)
  QUADRATIC = 1      // Pay-per-vote with quadratic cost (premium feature)
}

// Types based on the smart contract
export interface Poll {
  id: bigint
  question: string
  options: string[]
  votes: bigint[]
  endTime: bigint
  isActive: boolean
  creator: Address
  totalFunding: bigint
  fundingToken: Address
  fundingType: FundingType
  distributionMode: DistributionMode
  status: PollStatus
  previousStatus: PollStatus
  votingType: VotingType
  totalVotesBought: bigint
}

export interface Funding {
  token: Address
  amount: bigint
  funder: Address
  timestamp: bigint
}

export interface PollFundingBreakdown {
  totalFunded: bigint
  expectedDistribution: bigint
  actualParticipants: bigint
  distributed: bigint
  remaining: bigint
  claimDeadline: bigint
  claimPeriodExpired: boolean
}

// Duration constants from contract
export const MIN_POLL_DURATION = 3600n // 1 hour in seconds
export const MAX_POLL_DURATION = 2592000n // 30 days in seconds