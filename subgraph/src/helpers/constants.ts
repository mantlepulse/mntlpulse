import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts'

// Zero values
export const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000')
export const BIGINT_ZERO = BigInt.fromI32(0)
export const BIGINT_ONE = BigInt.fromI32(1)

// Time constants
export const SECONDS_PER_DAY = BigInt.fromI32(86400)

// Global stats singleton ID
export const GLOBAL_STATS_ID = Bytes.fromHexString('0x676c6f62616c') // "global" in hex

// ETH token representation
export const ETH_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000')
export const ETH_SYMBOL = 'ETH'
export const ETH_NAME = 'Ether'
export const ETH_DECIMALS = 18

// Distribution mode enum mapping
export const DISTRIBUTION_MODE_MANUAL_PULL = 'MANUAL_PULL'
export const DISTRIBUTION_MODE_MANUAL_PUSH = 'MANUAL_PUSH'
export const DISTRIBUTION_MODE_AUTOMATED = 'AUTOMATED'

// Distribution type enum mapping
export const DISTRIBUTION_TYPE_WITHDRAWN = 'WITHDRAWN'
export const DISTRIBUTION_TYPE_DISTRIBUTED = 'DISTRIBUTED'
export const DISTRIBUTION_TYPE_CLAIMED = 'CLAIMED'

// Funding type enum mapping
export const FUNDING_TYPE_NONE = 'NONE'
export const FUNDING_TYPE_SELF = 'SELF'
export const FUNDING_TYPE_COMMUNITY = 'COMMUNITY'

// Poll status enum mapping
export const POLL_STATUS_ACTIVE = 'ACTIVE'
export const POLL_STATUS_CLOSED = 'CLOSED'
export const POLL_STATUS_FOR_CLAIMING = 'FOR_CLAIMING'
export const POLL_STATUS_PAUSED = 'PAUSED'

// Voting type enum mapping
export const VOTING_TYPE_LINEAR = 'LINEAR'
export const VOTING_TYPE_QUADRATIC = 'QUADRATIC'

// Subscription tier enum mapping
export const SUBSCRIPTION_TIER_NONE = 'NONE'
export const SUBSCRIPTION_TIER_MONTHLY = 'MONTHLY'
export const SUBSCRIPTION_TIER_ANNUAL = 'ANNUAL'
export const SUBSCRIPTION_TIER_LIFETIME = 'LIFETIME'

// Stats singleton IDs
export const QV_STATS_ID = Bytes.fromHexString('0x71762d7374617473') // "qv-stats" in hex
export const STAKING_STATS_ID = Bytes.fromHexString('0x7374616b696e672d7374617473') // "staking-stats" in hex
export const SUBSCRIPTION_STATS_ID = Bytes.fromHexString('0x737562736372697074696f6e2d7374617473') // "subscription-stats" in hex
