import { pgTable, uuid, text, integer, timestamp, index, boolean, jsonb } from 'drizzle-orm/pg-core';

/**
 * Project status types
 */
export type ProjectStatus = 'active' | 'completed' | 'archived';

/**
 * Project settings/configuration
 */
export interface ProjectSettings {
  showVoteBreakdown?: boolean;
  showTrends?: boolean;
  showParticipantInsights?: boolean;
  customLabels?: Record<string, string>;
}

/**
 * Projects - group polls together for organization and insights
 */
export const projects = pgTable('Project', {
  id: uuid('id').defaultRandom().primaryKey(),
  creatorAddress: text('creatorAddress').notNull(), // Creator wallet address
  // Project details
  name: text('name').notNull(),
  description: text('description'),
  // Optional categorization
  category: text('category'), // e.g., 'Product Feedback', 'Community', 'Research'
  tags: jsonb('tags').$type<string[]>(),
  // Project settings
  settings: jsonb('settings').$type<ProjectSettings>(),
  // Status tracking
  status: text('status').default('active').notNull().$type<ProjectStatus>(),
  // Stats (denormalized for performance)
  pollCount: integer('pollCount').default(0).notNull(),
  totalVotes: integer('totalVotes').default(0).notNull(),
  totalFunding: text('totalFunding').default('0').notNull(), // Store as string for precision
  // Timestamps
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('Project_creator_idx').on(table.creatorAddress),
  statusIdx: index('Project_status_idx').on(table.status),
  createdAtIdx: index('Project_createdAt_idx').on(table.createdAt),
}));

/**
 * Project polls - association between projects and polls
 * A poll can belong to multiple projects (many-to-many)
 */
export const projectPolls = pgTable('ProjectPoll', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('projectId').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  // Poll reference (chainId + pollId from on-chain)
  chainId: integer('chainId').notNull(),
  pollId: text('pollId').notNull(), // On-chain poll ID as string
  // Optional ordering within project
  sortOrder: integer('sortOrder').default(0).notNull(),
  // When poll was added to project
  addedAt: timestamp('addedAt').defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('ProjectPoll_project_idx').on(table.projectId),
  pollIdx: index('ProjectPoll_poll_idx').on(table.chainId, table.pollId),
  uniqueProjectPoll: index('ProjectPoll_unique_idx').on(table.projectId, table.chainId, table.pollId),
}));

/**
 * Project insights - cached aggregated analytics for projects
 */
export const projectInsights = pgTable('ProjectInsight', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('projectId').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  // Insight data
  insightType: text('insightType').notNull(), // 'vote_distribution', 'participation_trend', 'option_correlation'
  data: jsonb('data').notNull(),
  // Validity
  generatedAt: timestamp('generatedAt').defaultNow().notNull(),
  validUntil: timestamp('validUntil'),
}, (table) => ({
  projectIdx: index('ProjectInsight_project_idx').on(table.projectId),
  typeIdx: index('ProjectInsight_type_idx').on(table.insightType),
}));

// Type exports
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectPoll = typeof projectPolls.$inferSelect;
export type NewProjectPoll = typeof projectPolls.$inferInsert;
export type ProjectInsight = typeof projectInsights.$inferSelect;
export type NewProjectInsight = typeof projectInsights.$inferInsert;
