import { BigInt, Bytes } from '@graphprotocol/graph-ts'
import { GlobalStats, DailyStats } from '../../generated/schema'
import { BIGINT_ZERO, BIGINT_ONE, SECONDS_PER_DAY, GLOBAL_STATS_ID } from './constants'

/**
 * Get or create GlobalStats singleton entity
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 * @returns GlobalStats entity
 */
export function getOrCreateGlobalStats(timestamp: BigInt, blockNumber: BigInt): GlobalStats {
  let stats = GlobalStats.load(GLOBAL_STATS_ID)

  if (stats === null) {
    stats = new GlobalStats(GLOBAL_STATS_ID)
    stats.totalPolls = BIGINT_ZERO
    stats.totalVotes = BIGINT_ZERO
    stats.totalFunding = BIGINT_ZERO
    stats.totalDistributions = BIGINT_ZERO
    stats.totalUsers = BIGINT_ZERO
    stats.totalVoters = BIGINT_ZERO
    stats.totalFunders = BIGINT_ZERO
    stats.whitelistedTokens = BIGINT_ZERO
    stats.updatedAt = timestamp
    stats.updatedAtBlock = blockNumber
    stats.save()
  }

  return stats
}

/**
 * Get or create DailyStats entity for a given day
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 * @returns DailyStats entity
 */
export function getOrCreateDailyStats(timestamp: BigInt, blockNumber: BigInt): DailyStats {
  // Calculate day start timestamp (round down to nearest day)
  let dayTimestamp = timestamp.div(SECONDS_PER_DAY).times(SECONDS_PER_DAY)
  let dayId = Bytes.fromUTF8(dayTimestamp.toString())

  let stats = DailyStats.load(dayId)

  if (stats === null) {
    stats = new DailyStats(dayId)
    stats.day = dayTimestamp
    stats.dailyPolls = BIGINT_ZERO
    stats.dailyVotes = BIGINT_ZERO
    stats.dailyFunding = BIGINT_ZERO
    stats.dailyDistributions = BIGINT_ZERO
    stats.dailyActiveUsers = BIGINT_ZERO
    stats.updatedAt = timestamp
    stats.updatedAtBlock = blockNumber
    stats.save()
  }

  return stats
}

/**
 * Update stats when a new poll is created
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function updateStatsForPollCreated(timestamp: BigInt, blockNumber: BigInt): void {
  // Update global stats
  let globalStats = getOrCreateGlobalStats(timestamp, blockNumber)
  globalStats.totalPolls = globalStats.totalPolls.plus(BIGINT_ONE)
  globalStats.updatedAt = timestamp
  globalStats.updatedAtBlock = blockNumber
  globalStats.save()

  // Update daily stats
  let dailyStats = getOrCreateDailyStats(timestamp, blockNumber)
  dailyStats.dailyPolls = dailyStats.dailyPolls.plus(BIGINT_ONE)
  dailyStats.updatedAt = timestamp
  dailyStats.updatedAtBlock = blockNumber
  dailyStats.save()
}

/**
 * Update stats when a vote is cast
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function updateStatsForVote(timestamp: BigInt, blockNumber: BigInt): void {
  // Update global stats
  let globalStats = getOrCreateGlobalStats(timestamp, blockNumber)
  globalStats.totalVotes = globalStats.totalVotes.plus(BIGINT_ONE)
  globalStats.updatedAt = timestamp
  globalStats.updatedAtBlock = blockNumber
  globalStats.save()

  // Update daily stats
  let dailyStats = getOrCreateDailyStats(timestamp, blockNumber)
  dailyStats.dailyVotes = dailyStats.dailyVotes.plus(BIGINT_ONE)
  dailyStats.updatedAt = timestamp
  dailyStats.updatedAtBlock = blockNumber
  dailyStats.save()
}

/**
 * Update stats when funding is added
 * @param amount Funding amount
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function updateStatsForFunding(
  amount: BigInt,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  // Update global stats
  let globalStats = getOrCreateGlobalStats(timestamp, blockNumber)
  globalStats.totalFunding = globalStats.totalFunding.plus(amount)
  globalStats.updatedAt = timestamp
  globalStats.updatedAtBlock = blockNumber
  globalStats.save()

  // Update daily stats
  let dailyStats = getOrCreateDailyStats(timestamp, blockNumber)
  dailyStats.dailyFunding = dailyStats.dailyFunding.plus(amount)
  dailyStats.updatedAt = timestamp
  dailyStats.updatedAtBlock = blockNumber
  dailyStats.save()
}

/**
 * Update stats when distribution occurs
 * @param amount Distribution amount
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function updateStatsForDistribution(
  amount: BigInt,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  // Update global stats
  let globalStats = getOrCreateGlobalStats(timestamp, blockNumber)
  globalStats.totalDistributions = globalStats.totalDistributions.plus(amount)
  globalStats.updatedAt = timestamp
  globalStats.updatedAtBlock = blockNumber
  globalStats.save()

  // Update daily stats
  let dailyStats = getOrCreateDailyStats(timestamp, blockNumber)
  dailyStats.dailyDistributions = dailyStats.dailyDistributions.plus(amount)
  dailyStats.updatedAt = timestamp
  dailyStats.updatedAtBlock = blockNumber
  dailyStats.save()
}

/**
 * Increment total users count
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function incrementTotalUsers(timestamp: BigInt, blockNumber: BigInt): void {
  let globalStats = getOrCreateGlobalStats(timestamp, blockNumber)
  globalStats.totalUsers = globalStats.totalUsers.plus(BIGINT_ONE)
  globalStats.updatedAt = timestamp
  globalStats.updatedAtBlock = blockNumber
  globalStats.save()
}

/**
 * Increment total voters count
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function incrementTotalVoters(timestamp: BigInt, blockNumber: BigInt): void {
  let globalStats = getOrCreateGlobalStats(timestamp, blockNumber)
  globalStats.totalVoters = globalStats.totalVoters.plus(BIGINT_ONE)
  globalStats.updatedAt = timestamp
  globalStats.updatedAtBlock = blockNumber
  globalStats.save()
}

/**
 * Increment total funders count
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function incrementTotalFunders(timestamp: BigInt, blockNumber: BigInt): void {
  let globalStats = getOrCreateGlobalStats(timestamp, blockNumber)
  globalStats.totalFunders = globalStats.totalFunders.plus(BIGINT_ONE)
  globalStats.updatedAt = timestamp
  globalStats.updatedAtBlock = blockNumber
  globalStats.save()
}

/**
 * Increment whitelisted tokens count
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function incrementWhitelistedTokens(timestamp: BigInt, blockNumber: BigInt): void {
  let globalStats = getOrCreateGlobalStats(timestamp, blockNumber)
  globalStats.whitelistedTokens = globalStats.whitelistedTokens.plus(BIGINT_ONE)
  globalStats.updatedAt = timestamp
  globalStats.updatedAtBlock = blockNumber
  globalStats.save()
}

/**
 * Decrement whitelisted tokens count
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function decrementWhitelistedTokens(timestamp: BigInt, blockNumber: BigInt): void {
  let globalStats = getOrCreateGlobalStats(timestamp, blockNumber)
  if (globalStats.whitelistedTokens.gt(BIGINT_ZERO)) {
    globalStats.whitelistedTokens = globalStats.whitelistedTokens.minus(BIGINT_ONE)
  }
  globalStats.updatedAt = timestamp
  globalStats.updatedAtBlock = blockNumber
  globalStats.save()
}
