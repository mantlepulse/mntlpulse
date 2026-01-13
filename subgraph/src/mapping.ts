import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import {
  PollCreated,
  Voted,
  PollFunded,
  FundsWithdrawn,
  DistributionModeSet,
  RewardDistributed,
  RewardClaimed,
  TokenWhitelisted,
  PollStatusChanged,
  PollPaused,
  PollResumed,
  VotesBought,
} from '../generated/PollsContract/PollsContract'
import {
  Poll,
  Vote,
  Funding,
  Distribution,
  DistributionModeChange,
  VotePurchase,
  QuadraticVotingStats,
} from '../generated/schema'
import {
  getOrCreatePoll,
  updatePollTokenBalanceFunding,
  updatePollTokenBalanceDistribution,
  incrementPollVoteCount,
  incrementPollVoterCount,
} from './helpers/poll'
import {
  getOrCreateUser,
  incrementUserVotes,
  addUserReward,
  addUserFunding,
  incrementPollsCreated,
  incrementPollsParticipated,
} from './helpers/user'
import {
  getOrCreateToken,
  updateTokenFundingStats,
  updateTokenDistributionStats,
  updateTokenStatsFunding,
  updateTokenStatsDistribution,
} from './helpers/token'
import {
  updateStatsForPollCreated,
  updateStatsForVote,
  updateStatsForFunding,
  updateStatsForDistribution,
  incrementTotalUsers,
  incrementWhitelistedTokens,
  decrementWhitelistedTokens,
} from './helpers/stats'
import {
  BIGINT_ONE,
  BIGINT_ZERO,
  DISTRIBUTION_MODE_MANUAL_PULL,
  DISTRIBUTION_MODE_MANUAL_PUSH,
  DISTRIBUTION_MODE_AUTOMATED,
  DISTRIBUTION_TYPE_WITHDRAWN,
  DISTRIBUTION_TYPE_DISTRIBUTED,
  DISTRIBUTION_TYPE_CLAIMED,
  FUNDING_TYPE_NONE,
  FUNDING_TYPE_SELF,
  FUNDING_TYPE_COMMUNITY,
  POLL_STATUS_ACTIVE,
  POLL_STATUS_CLOSED,
  POLL_STATUS_FOR_CLAIMING,
  POLL_STATUS_PAUSED,
  VOTING_TYPE_LINEAR,
  VOTING_TYPE_QUADRATIC,
  QV_STATS_ID,
} from './helpers/constants'

/**
 * Handler for PollCreated event
 * Emitted when a new poll is created
 *
 * NOTE: We intentionally DON'T call getPoll() here because older contract versions
 * have different return structures that cause ABI decoding errors. Instead, we use
 * default values and let subsequent events (PollFunded, VotesBought, etc.) update
 * the poll with the correct data.
 */
export function handlePollCreated(event: PollCreated): void {
  let pollId = event.params.pollId
  let poll = getOrCreatePoll(pollId)

  // Default values - these will be updated by subsequent events if needed
  // We don't call getPoll() to avoid ABI compatibility issues with older contracts
  let fundingTokenAddress = Address.fromString('0x0000000000000000000000000000000000000000')
  let fundingTypeString = FUNDING_TYPE_NONE
  let statusString = POLL_STATUS_ACTIVE
  let previousStatusString = POLL_STATUS_ACTIVE
  let votingTypeString = VOTING_TYPE_LINEAR
  let totalVotesBought = BIGINT_ZERO

  // Get or create funding token entity
  let fundingToken = getOrCreateToken(fundingTokenAddress, event.block.timestamp, event.block.number)

  // Set poll details
  poll.pollId = pollId
  poll.creator = event.params.creator
  poll.question = event.params.question
  poll.endTime = event.params.endTime
  poll.isActive = true
  poll.distributionMode = DISTRIBUTION_MODE_MANUAL_PULL // Default mode
  poll.fundingToken = fundingTokenAddress
  poll.fundingType = fundingTypeString
  poll.status = statusString
  poll.previousStatus = previousStatusString
  poll.votingType = votingTypeString
  poll.totalVotesBought = totalVotesBought
  poll.createdAt = event.block.timestamp
  poll.createdAtBlock = event.block.number
  poll.updatedAt = event.block.timestamp
  poll.updatedAtBlock = event.block.number

  // Initialize empty arrays and counters
  poll.options = []
  poll.votes = []
  poll.totalFunding = BIGINT_ZERO

  poll.save()

  // NOTE: QV stats (totalQuadraticPolls) are now tracked in handleVotesBought
  // since we can't determine voting type without calling getPoll (which has ABI issues)

  // Update or create creator user
  let creator = getOrCreateUser(event.params.creator, event.block.timestamp, event.block.number)
  if (creator.pollsCreatedCount == 0) {
    incrementTotalUsers(event.block.timestamp, event.block.number)
  }
  incrementPollsCreated(creator, event.block.timestamp, event.block.number)

  // Update global statistics
  updateStatsForPollCreated(event.block.timestamp, event.block.number)
}

/**
 * Handler for Voted event
 * Emitted when a user casts a vote on a poll
 */
export function handleVoted(event: Voted): void {
  let pollId = event.params.pollId
  let poll = getOrCreatePoll(pollId)

  // Create vote entity
  let voteId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let vote = new Vote(voteId)
  vote.poll = Bytes.fromByteArray(Bytes.fromBigInt(pollId))
  vote.voter = event.params.voter
  vote.optionIndex = event.params.optionIndex
  vote.timestamp = event.block.timestamp
  vote.blockNumber = event.block.number
  vote.transactionHash = event.transaction.hash
  vote.save()

  // Update poll vote count
  incrementPollVoteCount(poll, event.block.timestamp, event.block.number)
  incrementPollVoterCount(poll)

  // Update or create voter user
  let voter = getOrCreateUser(event.params.voter, event.block.timestamp, event.block.number)
  let isFirstVote = voter.totalVotes == 0
  if (isFirstVote) {
    incrementTotalUsers(event.block.timestamp, event.block.number)
  }
  incrementUserVotes(voter, event.block.timestamp, event.block.number)
  incrementPollsParticipated(voter)

  // Update global statistics
  updateStatsForVote(event.block.timestamp, event.block.number)
}

/**
 * Handler for PollFunded event
 * Emitted when a poll receives funding (ETH or ERC20)
 */
export function handlePollFunded(event: PollFunded): void {
  let pollId = event.params.pollId
  let tokenAddress = event.params.token
  let amount = event.params.amount

  // Create funding entity
  let fundingId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let funding = new Funding(fundingId)
  funding.poll = Bytes.fromByteArray(Bytes.fromBigInt(pollId))
  funding.funder = event.params.funder
  funding.token = tokenAddress
  funding.amount = amount
  funding.timestamp = event.block.timestamp
  funding.blockNumber = event.block.number
  funding.transactionHash = event.transaction.hash
  funding.save()

  // Update poll token balance
  updatePollTokenBalanceFunding(
    pollId,
    tokenAddress,
    amount,
    event.block.timestamp,
    event.block.number
  )

  // Get or create token
  let token = getOrCreateToken(tokenAddress, event.block.timestamp, event.block.number)
  updateTokenFundingStats(token, amount, event.block.timestamp, event.block.number)

  // Update token statistics
  updateTokenStatsFunding(tokenAddress, amount, event.block.timestamp, event.block.number)

  // Update or create funder user
  let funder = getOrCreateUser(event.params.funder, event.block.timestamp, event.block.number)
  let isFirstFunding = funder.totalFunded.isZero()
  if (isFirstFunding) {
    incrementTotalUsers(event.block.timestamp, event.block.number)
  }
  addUserFunding(funder, amount, event.block.timestamp, event.block.number)

  // Update global statistics
  updateStatsForFunding(amount, event.block.timestamp, event.block.number)
}

/**
 * Handler for FundsWithdrawn event
 * Emitted when creator withdraws funds from a poll (MANUAL_PULL mode)
 */
export function handleFundsWithdrawn(event: FundsWithdrawn): void {
  let pollId = event.params.pollId
  let tokenAddress = event.params.token
  let amount = event.params.amount

  // Create distribution entity
  let distributionId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let distribution = new Distribution(distributionId)
  distribution.poll = Bytes.fromByteArray(Bytes.fromBigInt(pollId))
  distribution.recipient = event.params.recipient
  distribution.token = tokenAddress
  distribution.amount = amount
  distribution.eventType = DISTRIBUTION_TYPE_WITHDRAWN
  distribution.timestamp = event.block.timestamp
  distribution.blockNumber = event.block.number
  distribution.transactionHash = event.transaction.hash
  distribution.save()

  // Update poll token balance
  updatePollTokenBalanceDistribution(
    pollId,
    tokenAddress,
    amount,
    event.block.timestamp,
    event.block.number
  )

  // Update token statistics
  let token = getOrCreateToken(tokenAddress, event.block.timestamp, event.block.number)
  updateTokenDistributionStats(token, amount, event.block.timestamp, event.block.number)
  updateTokenStatsDistribution(tokenAddress, amount, event.block.timestamp, event.block.number)

  // Update recipient user
  let recipient = getOrCreateUser(event.params.recipient, event.block.timestamp, event.block.number)
  addUserReward(recipient, amount, event.block.timestamp, event.block.number)

  // Update global statistics
  updateStatsForDistribution(amount, event.block.timestamp, event.block.number)
}

/**
 * Handler for DistributionModeSet event
 * Emitted when the distribution mode for a poll is changed
 */
export function handleDistributionModeSet(event: DistributionModeSet): void {
  let pollId = event.params.pollId
  let poll = getOrCreatePoll(pollId)

  // Store previous mode
  let previousMode = poll.distributionMode

  // Map enum value to string
  let newMode: string
  if (event.params.mode == 0) {
    newMode = DISTRIBUTION_MODE_MANUAL_PULL
  } else if (event.params.mode == 1) {
    newMode = DISTRIBUTION_MODE_MANUAL_PUSH
  } else {
    newMode = DISTRIBUTION_MODE_AUTOMATED
  }

  // Update poll distribution mode
  poll.distributionMode = newMode
  poll.updatedAt = event.block.timestamp
  poll.updatedAtBlock = event.block.number
  poll.save()

  // Create distribution mode change entity
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let change = new DistributionModeChange(changeId)
  change.poll = Bytes.fromByteArray(Bytes.fromBigInt(pollId))
  change.previousMode = previousMode
  change.newMode = newMode
  change.timestamp = event.params.timestamp
  change.blockNumber = event.block.number
  change.transactionHash = event.transaction.hash
  change.save()
}

/**
 * Handler for RewardDistributed event
 * Emitted when rewards are pushed to recipients (MANUAL_PUSH or AUTOMATED modes)
 */
export function handleRewardDistributed(event: RewardDistributed): void {
  let pollId = event.params.pollId
  let tokenAddress = event.params.token
  let amount = event.params.amount

  // Create distribution entity
  let distributionId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let distribution = new Distribution(distributionId)
  distribution.poll = Bytes.fromByteArray(Bytes.fromBigInt(pollId))
  distribution.recipient = event.params.recipient
  distribution.token = tokenAddress
  distribution.amount = amount
  distribution.eventType = DISTRIBUTION_TYPE_DISTRIBUTED
  distribution.timestamp = event.params.timestamp
  distribution.blockNumber = event.block.number
  distribution.transactionHash = event.transaction.hash
  distribution.save()

  // Update poll token balance
  updatePollTokenBalanceDistribution(
    pollId,
    tokenAddress,
    amount,
    event.params.timestamp,
    event.block.number
  )

  // Update token statistics
  let token = getOrCreateToken(tokenAddress, event.params.timestamp, event.block.number)
  updateTokenDistributionStats(token, amount, event.params.timestamp, event.block.number)
  updateTokenStatsDistribution(tokenAddress, amount, event.params.timestamp, event.block.number)

  // Update recipient user
  let recipient = getOrCreateUser(event.params.recipient, event.params.timestamp, event.block.number)
  addUserReward(recipient, amount, event.params.timestamp, event.block.number)

  // Update global statistics
  updateStatsForDistribution(amount, event.params.timestamp, event.block.number)
}

/**
 * Handler for RewardClaimed event
 * Emitted when a user claims rewards (MANUAL_PULL mode)
 */
export function handleRewardClaimed(event: RewardClaimed): void {
  let pollId = event.params.pollId
  let tokenAddress = event.params.token
  let amount = event.params.amount

  // Create distribution entity
  let distributionId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let distribution = new Distribution(distributionId)
  distribution.poll = Bytes.fromByteArray(Bytes.fromBigInt(pollId))
  distribution.recipient = event.params.claimer
  distribution.token = tokenAddress
  distribution.amount = amount
  distribution.eventType = DISTRIBUTION_TYPE_CLAIMED
  distribution.timestamp = event.params.timestamp
  distribution.blockNumber = event.block.number
  distribution.transactionHash = event.transaction.hash
  distribution.save()

  // Update poll token balance
  updatePollTokenBalanceDistribution(
    pollId,
    tokenAddress,
    amount,
    event.params.timestamp,
    event.block.number
  )

  // Update token statistics
  let token = getOrCreateToken(tokenAddress, event.params.timestamp, event.block.number)
  updateTokenDistributionStats(token, amount, event.params.timestamp, event.block.number)
  updateTokenStatsDistribution(tokenAddress, amount, event.params.timestamp, event.block.number)

  // Update claimer user
  let claimer = getOrCreateUser(event.params.claimer, event.params.timestamp, event.block.number)
  addUserReward(claimer, amount, event.params.timestamp, event.block.number)

  // Update global statistics
  updateStatsForDistribution(amount, event.params.timestamp, event.block.number)
}

/**
 * Handler for TokenWhitelisted event
 * Emitted when a token is whitelisted or removed from whitelist
 */
export function handleTokenWhitelisted(event: TokenWhitelisted): void {
  let tokenAddress = event.params.token
  let status = event.params.status

  // Get or create token
  let token = getOrCreateToken(tokenAddress, event.block.timestamp, event.block.number)

  // Track whether this is a status change
  let wasWhitelisted = token.isWhitelisted

  // Update token whitelist status
  token.isWhitelisted = status

  if (status && !wasWhitelisted) {
    // Token was just whitelisted
    token.whitelistedAt = event.block.timestamp
    token.whitelistedAtBlock = event.block.number
    incrementWhitelistedTokens(event.block.timestamp, event.block.number)
  } else if (!status && wasWhitelisted) {
    // Token was just removed from whitelist
    decrementWhitelistedTokens(event.block.timestamp, event.block.number)
  }

  token.save()
}

/**
 * Handler for PollStatusChanged event
 * Emitted when a poll's status is changed (ACTIVE, CLOSED, FOR_CLAIMING, PAUSED)
 */
export function handlePollStatusChanged(event: PollStatusChanged): void {
  let pollId = event.params.pollId
  let poll = getOrCreatePoll(pollId)

  // Map old status enum value to string
  let oldStatusValue = event.params.oldStatus
  let oldStatusString = POLL_STATUS_ACTIVE
  if (oldStatusValue == 1) {
    oldStatusString = POLL_STATUS_CLOSED
  } else if (oldStatusValue == 2) {
    oldStatusString = POLL_STATUS_FOR_CLAIMING
  } else if (oldStatusValue == 3) {
    oldStatusString = POLL_STATUS_PAUSED
  }

  // Map new status enum value to string
  let newStatusValue = event.params.newStatus
  let newStatusString = POLL_STATUS_ACTIVE
  if (newStatusValue == 1) {
    newStatusString = POLL_STATUS_CLOSED
  } else if (newStatusValue == 2) {
    newStatusString = POLL_STATUS_FOR_CLAIMING
  } else if (newStatusValue == 3) {
    newStatusString = POLL_STATUS_PAUSED
  }

  // Update poll status
  poll.previousStatus = oldStatusString
  poll.status = newStatusString
  poll.isActive = (newStatusString == POLL_STATUS_ACTIVE)
  poll.updatedAt = event.params.timestamp
  poll.updatedAtBlock = event.block.number
  poll.save()
}

/**
 * Handler for PollPaused event
 * Emitted when a poll is paused
 */
export function handlePollPaused(event: PollPaused): void {
  let pollId = event.params.pollId
  let poll = getOrCreatePoll(pollId)

  // Update poll status to PAUSED
  poll.status = POLL_STATUS_PAUSED
  poll.isActive = false
  poll.updatedAt = event.params.timestamp
  poll.updatedAtBlock = event.block.number
  poll.save()
}

/**
 * Handler for PollResumed event
 * Emitted when a paused poll is resumed
 */
export function handlePollResumed(event: PollResumed): void {
  let pollId = event.params.pollId
  let poll = getOrCreatePoll(pollId)

  // Resume to previous status (usually ACTIVE)
  // The PollStatusChanged event will be emitted before this, so status is already updated
  // This is just a convenience event for tracking resume actions
  poll.updatedAt = event.params.timestamp
  poll.updatedAtBlock = event.block.number
  poll.save()
}

/**
 * Handler for VotesBought event
 * Emitted when a user buys votes in a quadratic voting poll
 */
export function handleVotesBought(event: VotesBought): void {
  let pollId = event.params.pollId
  let poll = getOrCreatePoll(pollId)

  // Track if this is the first VotesBought event for this poll
  // (used to count quadratic polls since we can't determine type at creation)
  let isFirstQVEventForPoll = poll.votingType != VOTING_TYPE_QUADRATIC

  // Create vote purchase entity
  let purchaseId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let purchase = new VotePurchase(purchaseId)
  purchase.poll = Bytes.fromByteArray(Bytes.fromBigInt(pollId))
  purchase.voter = event.params.voter
  purchase.optionIndex = event.params.optionIndex
  purchase.numVotes = event.params.numVotes
  purchase.cost = event.params.cost
  purchase.timestamp = event.params.timestamp
  purchase.blockNumber = event.block.number
  purchase.transactionHash = event.transaction.hash
  purchase.save()

  // Update poll - mark as quadratic and update vote counts
  poll.votingType = VOTING_TYPE_QUADRATIC
  poll.totalVotesBought = poll.totalVotesBought.plus(event.params.numVotes)
  poll.voteCount = poll.voteCount.plus(event.params.numVotes)
  poll.updatedAt = event.params.timestamp
  poll.updatedAtBlock = event.block.number
  poll.save()

  // Update voter user
  let voter = getOrCreateUser(event.params.voter, event.params.timestamp, event.block.number)
  let isFirstVote = voter.totalVotes == 0
  if (isFirstVote) {
    incrementTotalUsers(event.params.timestamp, event.block.number)
  }
  incrementUserVotes(voter, event.params.timestamp, event.block.number)
  incrementPollsParticipated(voter)

  // Update QV stats
  let qvStats = QuadraticVotingStats.load(QV_STATS_ID)
  if (qvStats == null) {
    qvStats = new QuadraticVotingStats(QV_STATS_ID)
    qvStats.totalQuadraticPolls = BIGINT_ZERO
    qvStats.totalVotesBought = BIGINT_ZERO
    qvStats.totalPulseSpent = BIGINT_ZERO
    qvStats.totalQVVoters = BIGINT_ZERO
    qvStats.updatedAt = event.params.timestamp
    qvStats.updatedAtBlock = event.block.number
  }
  // Increment quadratic polls count on first VotesBought event for this poll
  if (isFirstQVEventForPoll) {
    qvStats.totalQuadraticPolls = qvStats.totalQuadraticPolls.plus(BIGINT_ONE)
  }
  qvStats.totalVotesBought = qvStats.totalVotesBought.plus(event.params.numVotes)
  qvStats.totalPulseSpent = qvStats.totalPulseSpent.plus(event.params.cost)
  if (isFirstVote) {
    qvStats.totalQVVoters = qvStats.totalQVVoters.plus(BIGINT_ONE)
  }
  qvStats.updatedAt = event.params.timestamp
  qvStats.updatedAtBlock = event.block.number
  qvStats.save()

  // Update global statistics
  updateStatsForVote(event.params.timestamp, event.block.number)
}
