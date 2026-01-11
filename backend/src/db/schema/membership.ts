import { pgTable, uuid, text, integer, timestamp, index, unique, date, jsonb, boolean } from 'drizzle-orm/pg-core';

/**
 * Membership tier requirements type
 */
export interface TierRequirements {
  pollsParticipated: number;
  totalVotes: number;
  pollsCreated: number;
  seasonsCompleted: number;
}

/**
 * Membership tiers - admin-defined tier levels
 * Bronze, Silver, Gold, Platinum with different daily vote limits and max season points
 */
export const membershipTiers = pgTable('MembershipTier', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').unique().notNull(), // 'bronze' | 'silver' | 'gold' | 'platinum'
  name: text('name').notNull(),
  dailyVoteLimit: integer('dailyVoteLimit').notNull(), // 3, 6, 9, 12
  maxSeasonPoints: integer('maxSeasonPoints').notNull(),
  requirements: jsonb('requirements').$type<TierRequirements>().notNull(),
  displayOrder: integer('displayOrder').default(0).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('MembershipTier_slug_idx').on(table.slug),
  displayOrderIdx: index('MembershipTier_displayOrder_idx').on(table.displayOrder),
}));

/**
 * User membership - tracks each user's current tier and stats
 */
export const userMembership = pgTable('UserMembership', {
  id: uuid('id').defaultRandom().primaryKey(),
  address: text('address').unique().notNull(),
  currentTier: text('currentTier').default('bronze').notNull(), // FK to membershipTiers.slug
  tierUpdatedAt: timestamp('tierUpdatedAt').defaultNow().notNull(),
  // Cached stats for tier calculation
  pollsParticipated: integer('pollsParticipated').default(0).notNull(),
  totalVotesCast: integer('totalVotesCast').default(0).notNull(),
  pollsCreated: integer('pollsCreated').default(0).notNull(),
  seasonsCompleted: integer('seasonsCompleted').default(0).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  addressIdx: index('UserMembership_address_idx').on(table.address),
  tierIdx: index('UserMembership_tier_idx').on(table.currentTier),
}));

/**
 * Daily vote counts - for rate limiting votes per tier
 */
export const dailyVoteCounts = pgTable('DailyVoteCount', {
  id: uuid('id').defaultRandom().primaryKey(),
  address: text('address').notNull(),
  date: date('date').notNull(),
  voteCount: integer('voteCount').default(0).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  addressDateIdx: unique('DailyVoteCount_address_date_key').on(table.address, table.date),
  addressIdx: index('DailyVoteCount_address_idx').on(table.address),
  dateIdx: index('DailyVoteCount_date_idx').on(table.date),
}));

// Type exports
export type MembershipTier = typeof membershipTiers.$inferSelect;
export type NewMembershipTier = typeof membershipTiers.$inferInsert;
export type UserMembership = typeof userMembership.$inferSelect;
export type NewUserMembership = typeof userMembership.$inferInsert;
export type DailyVoteCount = typeof dailyVoteCounts.$inferSelect;
export type NewDailyVoteCount = typeof dailyVoteCounts.$inferInsert;
