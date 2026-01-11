import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { polls } from './polls';

export const distributionLogs = pgTable('DistributionLog', {
  id: uuid('id').defaultRandom().primaryKey(),
  pollId: uuid('pollId').notNull().references(() => polls.id, { onDelete: 'cascade' }),
  recipient: text('recipient').notNull(),
  amount: text('amount').notNull(),
  token: text('token').default('0x0000000000000000000000000000000000000000').notNull(),
  txHash: text('txHash').notNull(),
  eventType: text('eventType').notNull(), // "distributed", "claimed", "withdrawn"
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  pollIdIdx: index('DistributionLog_pollId_idx').on(table.pollId),
  recipientIdx: index('DistributionLog_recipient_idx').on(table.recipient),
  eventTypeIdx: index('DistributionLog_eventType_idx').on(table.eventType),
  timestampIdx: index('DistributionLog_timestamp_idx').on(table.timestamp),
}));

export type DistributionLog = typeof distributionLogs.$inferSelect;
export type NewDistributionLog = typeof distributionLogs.$inferInsert;
