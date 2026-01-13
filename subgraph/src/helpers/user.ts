import { Address, BigInt } from '@graphprotocol/graph-ts'
import { User } from '../../generated/schema'
import { BIGINT_ZERO } from './constants'

/**
 * Get or create a User entity
 * @param address User address
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 * @returns User entity
 */
export function getOrCreateUser(
  address: Address,
  timestamp: BigInt,
  blockNumber: BigInt
): User {
  let user = User.load(address)

  if (user === null) {
    user = new User(address)
    user.address = address
    user.totalRewards = BIGINT_ZERO
    user.totalFunded = BIGINT_ZERO
    user.pollsParticipated = 0
    user.totalVotes = 0
    user.pollsCreatedCount = 0
    user.firstSeenAt = timestamp
    user.firstSeenAtBlock = blockNumber
    user.lastSeenAt = timestamp
    user.lastSeenAtBlock = blockNumber
    user.save()
  }

  return user
}

/**
 * Update user statistics when they vote
 * @param user User entity
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function incrementUserVotes(
  user: User,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  user.totalVotes = user.totalVotes + 1
  user.lastSeenAt = timestamp
  user.lastSeenAtBlock = blockNumber
  user.save()
}

/**
 * Update user statistics when they receive rewards
 * @param user User entity
 * @param amount Reward amount
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function addUserReward(
  user: User,
  amount: BigInt,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  user.totalRewards = user.totalRewards.plus(amount)
  user.lastSeenAt = timestamp
  user.lastSeenAtBlock = blockNumber
  user.save()
}

/**
 * Update user statistics when they fund a poll
 * @param user User entity
 * @param amount Funding amount
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function addUserFunding(
  user: User,
  amount: BigInt,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  user.totalFunded = user.totalFunded.plus(amount)
  user.lastSeenAt = timestamp
  user.lastSeenAtBlock = blockNumber
  user.save()
}

/**
 * Increment polls created count
 * @param user User entity
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function incrementPollsCreated(
  user: User,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  user.pollsCreatedCount = user.pollsCreatedCount + 1
  user.lastSeenAt = timestamp
  user.lastSeenAtBlock = blockNumber
  user.save()
}

/**
 * Increment polls participated count
 * @param user User entity
 */
export function incrementPollsParticipated(user: User): void {
  user.pollsParticipated = user.pollsParticipated + 1
  user.save()
}
