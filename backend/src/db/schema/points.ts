import { pgTable, uuid, text, integer, timestamp, index, unique, boolean } from 'drizzle-orm/pg-core';
import { seasons } from './seasons';

/**
 * Points transaction types
 */
export type PointsTransactionType = 'quest_reward' | 'bonus' | 'adjustment';

/**
 * User season points - tracks accumulated points per user per season
 */
export const userSeasonPoints = pgTable('UserSeasonPoints', {
  id: uuid('id').defaultRandom().primaryKey(),
  address: text('address').notNull(),
  seasonId: uuid('seasonId').references(() => seasons.id).notNull(),
  totalPoints: integer('totalPoints').default(0).notNull(),
  // Token claim tracking
  pulseEarned: text('pulseEarned').default('0').notNull(), // Calculated at season end (BigInt as string)
  pulseClaimed: boolean('pulseClaimed').default(false).notNull(),
  claimTxHash: text('claimTxHash'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  addressSeasonIdx: unique('UserSeasonPoints_address_season_key').on(table.address, table.seasonId),
  addressIdx: index('UserSeasonPoints_address_idx').on(table.address),
  seasonIdx: index('UserSeasonPoints_season_idx').on(table.seasonId),
  pointsIdx: index('UserSeasonPoints_points_idx').on(table.totalPoints),
}));

/**
 * Points transactions - full audit log of all point changes
 */
export const pointsTransactions = pgTable('PointsTransaction', {
  id: uuid('id').defaultRandom().primaryKey(),
  address: text('address').notNull(),
  seasonId: uuid('seasonId').references(() => seasons.id).notNull(),
  amount: integer('amount').notNull(), // Can be negative for deductions/adjustments
  type: text('type').notNull().$type<PointsTransactionType>(),
  // Reference to source
  questId: uuid('questId'), // FK to creatorQuests, nullable for non-quest transactions
  description: text('description'),
  // For audit/reversal purposes
  reversedAt: timestamp('reversedAt'),
  reversedBy: text('reversedBy'), // Admin address who reversed
  reversalReason: text('reversalReason'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  addressIdx: index('PointsTransaction_address_idx').on(table.address),
  seasonIdx: index('PointsTransaction_season_idx').on(table.seasonId),
  typeIdx: index('PointsTransaction_type_idx').on(table.type),
  questIdx: index('PointsTransaction_quest_idx').on(table.questId),
}));

// Type exports
export type UserSeasonPoints = typeof userSeasonPoints.$inferSelect;
export type NewUserSeasonPoints = typeof userSeasonPoints.$inferInsert;
export type PointsTransaction = typeof pointsTransactions.$inferSelect;
export type NewPointsTransaction = typeof pointsTransactions.$inferInsert;
