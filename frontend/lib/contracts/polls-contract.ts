import { Address } from 'viem'
import PollsContractArtifact from './PollsContract.abi.json'

export const POLLS_CONTRACT_ABI = PollsContractArtifact.abi as const

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

  // Write functions
  CREATE_POLL: 'createPoll',
  CREATE_POLL_WITH_VOTING_TYPE: 'createPollWithVotingType',
  VOTE: 'vote',
  BUY_VOTES: 'buyVotes',
  FUND_POLL_WITH_ETH: 'fundPollWithETH',
  FUND_POLL_WITH_TOKEN: 'fundPollWithToken',
  WITHDRAW_FUNDS: 'withdrawFunds',
  CLOSE_POLL: 'closePoll',
  SET_FOR_CLAIMING: 'setForClaiming',
  PAUSE_POLL: 'pausePoll',
  RESUME_POLL: 'resumePoll',
  WHITELIST_TOKEN: 'whitelistToken',
} as const

// Event names for listening to contract events
export const CONTRACT_EVENTS = {
  POLL_CREATED: 'PollCreated',
  VOTED: 'Voted',
  POLL_FUNDED: 'PollFunded',
  TOKEN_WHITELISTED: 'TokenWhitelisted',
  FUNDS_WITHDRAWN: 'FundsWithdrawn',
  VOTES_BOUGHT: 'VotesBought',
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
  PAUSED = 3         // Temporarily suspended
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

// Duration constants from contract
export const MIN_POLL_DURATION = 3600n // 1 hour in seconds
export const MAX_POLL_DURATION = 2592000n // 30 days in seconds