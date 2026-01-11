import { pgTable, uuid, integer, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

/**
 * Staking schema - tracks PULSE token staking for premium access
 */
export const stakes = pgTable('Stake', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chainId').notNull(),
  address: text('address').notNull(), // User's wallet address
  amount: text('amount').notNull(), // Staked amount (stored as string for bigint)
  stakingStartTime: timestamp('stakingStartTime'), // When staking started
  lastRewardClaim: timestamp('lastRewardClaim'), // Last reward claim timestamp
  totalRewardsClaimed: text('totalRewardsClaimed').default('0'), // Total rewards claimed
  isActive: boolean('isActive').default(true).notNull(),
  isPremium: boolean('isPremium').default(false).notNull(), // Whether stake qualifies for premium
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  chainIdIdx: index('Stake_chainId_idx').on(table.chainId),
  addressIdx: index('Stake_address_idx').on(table.address),
  chainAddressIdx: index('Stake_chainId_address_idx').on(table.chainId, table.address),
}));

/**
 * Staking events log - tracks stake/unstake/claim events
 */
export const stakingEvents = pgTable('StakingEvent', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chainId').notNull(),
  address: text('address').notNull(),
  eventType: text('eventType').notNull(), // 'STAKE' | 'UNSTAKE' | 'CLAIM_REWARDS'
  amount: text('amount').notNull(), // Amount involved in event
  transactionHash: text('transactionHash'),
  blockNumber: text('blockNumber'),
  timestamp: timestamp('timestamp').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  chainIdIdx: index('StakingEvent_chainId_idx').on(table.chainId),
  addressIdx: index('StakingEvent_address_idx').on(table.address),
  eventTypeIdx: index('StakingEvent_eventType_idx').on(table.eventType),
}));

/**
 * Global staking stats cache
 */
export const stakingStats = pgTable('StakingStats', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chainId').notNull().unique(),
  totalStaked: text('totalStaked').default('0').notNull(),
  totalStakers: integer('totalStakers').default(0).notNull(),
  totalPremiumStakers: integer('totalPremiumStakers').default(0).notNull(),
  totalRewardsDistributed: text('totalRewardsDistributed').default('0').notNull(),
  rewardRatePerSecond: text('rewardRatePerSecond').default('0'),
  minimumStakeForPremium: text('minimumStakeForPremium').default('10000000000000000000000'), // 10,000 PULSE
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type Stake = typeof stakes.$inferSelect;
export type NewStake = typeof stakes.$inferInsert;
export type StakingEvent = typeof stakingEvents.$inferSelect;
export type NewStakingEvent = typeof stakingEvents.$inferInsert;
export type StakingStatsType = typeof stakingStats.$inferSelect;
export type NewStakingStats = typeof stakingStats.$inferInsert;
