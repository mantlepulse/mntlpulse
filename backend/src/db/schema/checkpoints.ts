import { pgTable, text, timestamp, bigint, uuid } from 'drizzle-orm/pg-core';

/**
 * Checkpoints table for tracking last processed blockchain events
 */
export const checkpoints = pgTable('Checkpoint', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: text('chainId').notNull().unique(),
  lastBlockNumber: bigint('lastBlockNumber', { mode: 'bigint' }).notNull(),
  lastProcessedAt: timestamp('lastProcessedAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type Checkpoint = typeof checkpoints.$inferSelect;
export type NewCheckpoint = typeof checkpoints.$inferInsert;
