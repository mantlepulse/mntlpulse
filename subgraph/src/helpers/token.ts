import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { Token, TokenStats } from '../../generated/schema'
import {
  ZERO_ADDRESS,
  BIGINT_ZERO,
  NATIVE_TOKEN_SYMBOL,
  NATIVE_TOKEN_NAME,
  NATIVE_TOKEN_DECIMALS,
} from './constants'

/**
 * Get or create a Token entity
 * @param address Token address (0x0 for native token MNT)
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 * @returns Token entity
 */
export function getOrCreateToken(
  address: Address,
  timestamp: BigInt,
  blockNumber: BigInt
): Token {
  let token = Token.load(address)

  if (token === null) {
    token = new Token(address)
    token.address = address
    token.isWhitelisted = false
    token.whitelistedAt = null
    token.whitelistedAtBlock = null
    token.totalFunded = BIGINT_ZERO
    token.totalDistributed = BIGINT_ZERO
    token.fundingCount = BIGINT_ZERO
    token.distributionCount = BIGINT_ZERO
    token.firstSeenAt = timestamp
    token.firstSeenAtBlock = blockNumber
    token.lastSeenAt = timestamp
    token.lastSeenAtBlock = blockNumber

    // Handle native token (address 0x0) as special case - MNT on Mantle
    if (address.equals(ZERO_ADDRESS)) {
      token.symbol = NATIVE_TOKEN_SYMBOL
      token.name = NATIVE_TOKEN_NAME
      token.decimals = NATIVE_TOKEN_DECIMALS
    } else {
      // For ERC20 tokens, set placeholder values
      // In a production setup, you would call the token contract to get these values
      token.symbol = 'UNKNOWN'
      token.name = 'Unknown Token'
      token.decimals = 18
    }

    token.save()
  }

  return token
}

/**
 * Update token statistics when funded
 * @param token Token entity
 * @param amount Amount funded
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function updateTokenFundingStats(
  token: Token,
  amount: BigInt,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  token.totalFunded = token.totalFunded.plus(amount)
  token.fundingCount = token.fundingCount.plus(BigInt.fromI32(1))
  token.lastSeenAt = timestamp
  token.lastSeenAtBlock = blockNumber
  token.save()
}

/**
 * Update token statistics when distributed
 * @param token Token entity
 * @param amount Amount distributed
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function updateTokenDistributionStats(
  token: Token,
  amount: BigInt,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  token.totalDistributed = token.totalDistributed.plus(amount)
  token.distributionCount = token.distributionCount.plus(BigInt.fromI32(1))
  token.lastSeenAt = timestamp
  token.lastSeenAtBlock = blockNumber
  token.save()
}

/**
 * Get or create TokenStats entity
 * @param tokenAddress Token address
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 * @returns TokenStats entity
 */
export function getOrCreateTokenStats(
  tokenAddress: Address,
  timestamp: BigInt,
  blockNumber: BigInt
): TokenStats {
  let stats = TokenStats.load(tokenAddress)

  if (stats === null) {
    stats = new TokenStats(tokenAddress)
    stats.token = tokenAddress
    stats.totalFundingVolume = BIGINT_ZERO
    stats.totalDistributionVolume = BIGINT_ZERO
    stats.fundingCount = BIGINT_ZERO
    stats.distributionCount = BIGINT_ZERO
    stats.pollsFunded = BIGINT_ZERO
    stats.updatedAt = timestamp
    stats.updatedAtBlock = blockNumber
    stats.save()
  }

  return stats
}

/**
 * Update TokenStats for funding
 * @param tokenAddress Token address
 * @param amount Amount funded
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function updateTokenStatsFunding(
  tokenAddress: Address,
  amount: BigInt,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  let stats = getOrCreateTokenStats(tokenAddress, timestamp, blockNumber)
  stats.totalFundingVolume = stats.totalFundingVolume.plus(amount)
  stats.fundingCount = stats.fundingCount.plus(BigInt.fromI32(1))
  stats.updatedAt = timestamp
  stats.updatedAtBlock = blockNumber
  stats.save()
}

/**
 * Update TokenStats for distribution
 * @param tokenAddress Token address
 * @param amount Amount distributed
 * @param timestamp Current timestamp
 * @param blockNumber Current block number
 */
export function updateTokenStatsDistribution(
  tokenAddress: Address,
  amount: BigInt,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  let stats = getOrCreateTokenStats(tokenAddress, timestamp, blockNumber)
  stats.totalDistributionVolume = stats.totalDistributionVolume.plus(amount)
  stats.distributionCount = stats.distributionCount.plus(BigInt.fromI32(1))
  stats.updatedAt = timestamp
  stats.updatedAtBlock = blockNumber
  stats.save()
}
