import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { Poll, PollTokenBalance } from '../../generated/schema'
import { BIGINT_ZERO, VOTING_TYPE_LINEAR } from './constants'

/**
 * Get or create a Poll entity
 * @param pollId On-chain poll ID
 * @returns Poll entity
 */
export function getOrCreatePoll(pollId: BigInt): Poll {
  let pollIdBytes = Bytes.fromByteArray(Bytes.fromBigInt(pollId))
  let poll = Poll.load(pollIdBytes)

  if (poll === null) {
    poll = new Poll(pollIdBytes)
    poll.pollId = pollId
    poll.voteCount = BIGINT_ZERO
    poll.voterCount = BIGINT_ZERO
    poll.totalFundingAmount = BIGINT_ZERO
    poll.fundingCount = BIGINT_ZERO
    poll.votingType = VOTING_TYPE_LINEAR
    poll.totalVotesBought = BIGINT_ZERO
    // Don't save here - caller must set required fields (creator, question, etc.) before saving
  }

  return poll
}

/**
 * Get or create a PollTokenBalance entity
 * @param pollId Poll ID
 * @param tokenAddress Token address
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 * @returns PollTokenBalance entity
 */
export function getOrCreatePollTokenBalance(
  pollId: BigInt,
  tokenAddress: Address,
  timestamp: BigInt,
  blockNumber: BigInt
): PollTokenBalance {
  // Create unique ID from poll ID and token address
  let id = Bytes.fromByteArray(Bytes.fromBigInt(pollId).concat(tokenAddress))
  let balance = PollTokenBalance.load(id)

  if (balance === null) {
    balance = new PollTokenBalance(id)
    balance.poll = Bytes.fromByteArray(Bytes.fromBigInt(pollId))
    balance.token = tokenAddress
    balance.balance = BIGINT_ZERO
    balance.totalFunded = BIGINT_ZERO
    balance.totalDistributed = BIGINT_ZERO
    balance.updatedAt = timestamp
    balance.updatedAtBlock = blockNumber
    balance.save()
  }

  return balance
}

/**
 * Update poll token balance when funded
 * @param pollId Poll ID
 * @param tokenAddress Token address
 * @param amount Amount to add
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function updatePollTokenBalanceFunding(
  pollId: BigInt,
  tokenAddress: Address,
  amount: BigInt,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  let balance = getOrCreatePollTokenBalance(pollId, tokenAddress, timestamp, blockNumber)
  balance.balance = balance.balance.plus(amount)
  balance.totalFunded = balance.totalFunded.plus(amount)
  balance.updatedAt = timestamp
  balance.updatedAtBlock = blockNumber
  balance.save()

  // Update poll total funding
  let poll = getOrCreatePoll(pollId)
  poll.totalFundingAmount = poll.totalFundingAmount.plus(amount)
  poll.fundingCount = poll.fundingCount.plus(BigInt.fromI32(1))
  poll.updatedAt = timestamp
  poll.updatedAtBlock = blockNumber
  poll.save()
}

/**
 * Update poll token balance when distributed
 * @param pollId Poll ID
 * @param tokenAddress Token address
 * @param amount Amount to subtract
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function updatePollTokenBalanceDistribution(
  pollId: BigInt,
  tokenAddress: Address,
  amount: BigInt,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  let balance = getOrCreatePollTokenBalance(pollId, tokenAddress, timestamp, blockNumber)
  balance.balance = balance.balance.minus(amount)
  balance.totalDistributed = balance.totalDistributed.plus(amount)
  balance.updatedAt = timestamp
  balance.updatedAtBlock = blockNumber
  balance.save()

  // Update poll timestamp
  let poll = getOrCreatePoll(pollId)
  poll.updatedAt = timestamp
  poll.updatedAtBlock = blockNumber
  poll.save()
}

/**
 * Increment vote count for a poll
 * @param poll Poll entity
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function incrementPollVoteCount(
  poll: Poll,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  poll.voteCount = poll.voteCount.plus(BigInt.fromI32(1))
  poll.updatedAt = timestamp
  poll.updatedAtBlock = blockNumber
  poll.save()
}

/**
 * Increment voter count for a poll
 * @param poll Poll entity
 */
export function incrementPollVoterCount(poll: Poll): void {
  poll.voterCount = poll.voterCount.plus(BigInt.fromI32(1))
  poll.save()
}
