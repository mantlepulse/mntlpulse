import { pgTable, uuid, integer, bigint, text, timestamp, unique, index } from 'drizzle-orm/pg-core';

export const polls = pgTable('Poll', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chainId').notNull(),
  pollId: bigint('pollId', { mode: 'bigint' }).notNull(),
  distributionMode: text('distributionMode').default('MANUAL_PULL').notNull(),
  // Optional display title that overrides the on-chain title
  displayTitle: text('displayTitle'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  chainIdIdx: index('Poll_chainId_idx').on(table.chainId),
  pollIdIdx: index('Poll_pollId_idx').on(table.pollId),
  uniqueChainPoll: unique('Poll_chainId_pollId_key').on(table.chainId, table.pollId),
}));

export type Poll = typeof polls.$inferSelect;
export type NewPoll = typeof polls.$inferInsert;
