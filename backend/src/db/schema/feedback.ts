import { pgTable, uuid, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

/**
 * Metadata stored with feedback (optional context)
 */
export interface FeedbackMetadata {
  browser?: string;
  page?: string;
  userAgent?: string;
  referrer?: string;
}

/**
 * Feedback categories
 */
export type FeedbackCategory = 'feature_request' | 'bug_report' | 'ui_ux' | 'general';

/**
 * Feedback status for iterative polling workflow
 */
export type FeedbackStatus = 'open' | 'selected' | 'polled' | 'closed';

/**
 * Feedback table for collecting user feedback
 */
export const feedbacks = pgTable('Feedback', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Feedback content
  category: text('category').notNull().$type<FeedbackCategory>(),
  content: text('content').notNull(),

  // User identity (optional - anonymous by default)
  walletAddress: text('walletAddress'),
  isAnonymous: boolean('isAnonymous').default(true).notNull(),

  // Status for iterative polling workflow
  status: text('status').default('open').notNull().$type<FeedbackStatus>(),

  // Optional metadata (browser, page, etc.)
  metadata: jsonb('metadata').$type<FeedbackMetadata>(),

  // Snapshot tracking - null means not yet snapshotted on-chain
  snapshotTxHash: text('snapshotTxHash'),
  snapshotedAt: timestamp('snapshotedAt'),

  // Timestamps
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('Feedback_status_idx').on(table.status),
  categoryIdx: index('Feedback_category_idx').on(table.category),
  createdAtIdx: index('Feedback_createdAt_idx').on(table.createdAt),
  snapshotIdx: index('Feedback_snapshot_idx').on(table.snapshotTxHash),
}));

export type Feedback = typeof feedbacks.$inferSelect;
export type NewFeedback = typeof feedbacks.$inferInsert;
