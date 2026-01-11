import { pgTable, uuid, text, timestamp, index, boolean } from 'drizzle-orm/pg-core';

/**
 * Season status types
 */
export type SeasonStatus = 'upcoming' | 'active' | 'ended' | 'distributed';

/**
 * Seasons - creator-owned seasons/tournaments for point accumulation
 * Any creator can create a season and fund it with PULSE tokens
 */
export const seasons = pgTable('Season', {
  id: uuid('id').defaultRandom().primaryKey(),
  creatorAddress: text('creatorAddress').notNull(), // Creator who owns this season
  name: text('name').notNull(), // e.g., "Season 1", "Launch Tournament"
  description: text('description'),
  startTime: timestamp('startTime').notNull(),
  endTime: timestamp('endTime').notNull(),
  // Token distribution config
  totalPulsePool: text('totalPulsePool').default('0').notNull(), // BigInt as string, funded by creator
  pulsePerPoint: text('pulsePerPoint'), // Calculated at season end
  // Status
  status: text('status').default('upcoming').notNull().$type<SeasonStatus>(),
  isPublic: boolean('isPublic').default(true).notNull(), // Visible to all or creator's audience only
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('Season_creator_idx').on(table.creatorAddress),
  statusIdx: index('Season_status_idx').on(table.status),
  startTimeIdx: index('Season_startTime_idx').on(table.startTime),
  endTimeIdx: index('Season_endTime_idx').on(table.endTime),
}));

// Type exports
export type Season = typeof seasons.$inferSelect;
export type NewSeason = typeof seasons.$inferInsert;
