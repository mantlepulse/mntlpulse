import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const leaderboard = pgTable('Leaderboard', {
  id: uuid('id').defaultRandom().primaryKey(),
  address: text('address').unique().notNull(),
  totalRewards: text('totalRewards').default('0').notNull(), // Stored as string to handle BigInt
  pollsParticipated: integer('pollsParticipated').default(0).notNull(),
  totalVotes: integer('totalVotes').default(0).notNull(),
  pollsCreated: integer('pollsCreated').default(0).notNull(),
  lastUpdated: timestamp('lastUpdated').defaultNow().notNull(),
}, (table) => ({
  addressIdx: index('Leaderboard_address_idx').on(table.address),
  totalRewardsIdx: index('Leaderboard_totalRewards_idx').on(table.totalRewards),
  pollsParticipatedIdx: index('Leaderboard_pollsParticipated_idx').on(table.pollsParticipated),
  totalVotesIdx: index('Leaderboard_totalVotes_idx').on(table.totalVotes),
}));

export type Leaderboard = typeof leaderboard.$inferSelect;
export type NewLeaderboard = typeof leaderboard.$inferInsert;
