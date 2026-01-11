import { relations } from 'drizzle-orm';
import { polls } from './polls';
import { distributionLogs } from './distribution';

export const pollsRelations = relations(polls, ({ many }) => ({
  distributionLogs: many(distributionLogs),
}));

export const distributionLogsRelations = relations(distributionLogs, ({ one }) => ({
  poll: one(polls, {
    fields: [distributionLogs.pollId],
    references: [polls.id],
  }),
}));
