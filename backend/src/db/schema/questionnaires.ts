import { pgTable, uuid, text, integer, timestamp, index, boolean, jsonb, bigint, numeric, unique } from 'drizzle-orm/pg-core';

/**
 * Questionnaire status types
 */
export type QuestionnaireStatus = 'draft' | 'active' | 'closed' | 'archived';

/**
 * Questionnaire settings/configuration
 */
export interface QuestionnaireSettings {
  allowPartialCompletion?: boolean;    // Can user complete subset of polls?
  showProgressBar?: boolean;           // Show completion progress?
  shuffleOrder?: boolean;              // Randomize poll order for each user?
  requireAllPolls?: boolean;           // Must answer all to be considered complete?
}

/**
 * Per-poll reward distribution configuration
 */
export interface PollRewardDistribution {
  pollId: string;           // On-chain poll ID
  chainId: number;
  percentage: number;       // % of total reward (0-100)
}

/**
 * Questionnaires - group polls together with ordering and reward distribution
 */
export const questionnaires = pgTable('Questionnaire', {
  id: uuid('id').defaultRandom().primaryKey(),
  // On-chain identifier (managed by API, used in smart contract)
  onChainId: bigint('onChainId', { mode: 'bigint' }).unique(),
  // Creator info
  creatorAddress: text('creatorAddress').notNull(),
  chainId: integer('chainId').notNull(),
  // Basic info
  title: text('title').notNull(),
  description: text('description'),
  category: text('category'),
  tags: jsonb('tags').$type<string[]>(),
  // Timing
  startTime: timestamp('startTime'),
  endTime: timestamp('endTime'),
  // Reward configuration
  totalRewardAmount: numeric('totalRewardAmount', { precision: 78, scale: 0 }).default('0'),
  fundingToken: text('fundingToken').default('0x0000000000000000000000000000000000000000'),
  rewardDistribution: jsonb('rewardDistribution').$type<PollRewardDistribution[]>(),
  // Settings
  settings: jsonb('settings').$type<QuestionnaireSettings>(),
  // Status
  status: text('status').default('draft').notNull().$type<QuestionnaireStatus>(),
  // Stats (denormalized)
  pollCount: integer('pollCount').default(0).notNull(),
  completionCount: integer('completionCount').default(0).notNull(),
  // Timestamps
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('Questionnaire_creator_idx').on(table.creatorAddress),
  chainIdIdx: index('Questionnaire_chainId_idx').on(table.chainId),
  statusIdx: index('Questionnaire_status_idx').on(table.status),
  onChainIdIdx: index('Questionnaire_onChainId_idx').on(table.onChainId),
  createdAtIdx: index('Questionnaire_createdAt_idx').on(table.createdAt),
}));

/**
 * Questionnaire polls - association with ordering and reward allocation
 */
export const questionnairePolls = pgTable('QuestionnairePoll', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionnaireId: uuid('questionnaireId').references(() => questionnaires.id, { onDelete: 'cascade' }).notNull(),
  // Poll reference (chainId + pollId from on-chain)
  chainId: integer('chainId').notNull(),
  pollId: bigint('pollId', { mode: 'bigint' }).notNull(),
  // Ordering within questionnaire
  sortOrder: integer('sortOrder').default(0).notNull(),
  // Reward allocation for this poll (% of total)
  rewardPercentage: numeric('rewardPercentage', { precision: 5, scale: 2 }).default('0'),
  // Source: 'new' = created with questionnaire, 'existing' = added from existing polls
  source: text('source').default('new').notNull(),
  // When added
  addedAt: timestamp('addedAt').defaultNow().notNull(),
}, (table) => ({
  questionnaireIdx: index('QuestionnairePoll_questionnaire_idx').on(table.questionnaireId),
  pollIdx: index('QuestionnairePoll_poll_idx').on(table.chainId, table.pollId),
  uniqueQuestionnairePoll: unique('QuestionnairePoll_unique_key').on(table.questionnaireId, table.chainId, table.pollId),
}));

/**
 * Track user progress through questionnaires
 */
export const questionnaireResponses = pgTable('QuestionnaireResponse', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionnaireId: uuid('questionnaireId').references(() => questionnaires.id, { onDelete: 'cascade' }).notNull(),
  userAddress: text('userAddress').notNull(),
  // Progress tracking
  pollsAnswered: jsonb('pollsAnswered').$type<string[]>(), // Array of pollIds answered
  completedAt: timestamp('completedAt'),
  isComplete: boolean('isComplete').default(false).notNull(),
  // Timestamps
  startedAt: timestamp('startedAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  questionnaireUserIdx: unique('QuestionnaireResponse_questionnaire_user_key').on(table.questionnaireId, table.userAddress),
  userIdx: index('QuestionnaireResponse_user_idx').on(table.userAddress),
  questionnaireIdx: index('QuestionnaireResponse_questionnaire_idx').on(table.questionnaireId),
}));

/**
 * On-chain ID counter - auto-increment per chain
 */
export const questionnaireIdCounters = pgTable('QuestionnaireIdCounter', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chainId').unique().notNull(),
  nextId: bigint('nextId', { mode: 'number' }).default(1).notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// Type exports
export type Questionnaire = typeof questionnaires.$inferSelect;
export type NewQuestionnaire = typeof questionnaires.$inferInsert;
export type QuestionnairePoll = typeof questionnairePolls.$inferSelect;
export type NewQuestionnairePoll = typeof questionnairePolls.$inferInsert;
export type QuestionnaireResponse = typeof questionnaireResponses.$inferSelect;
export type NewQuestionnaireResponse = typeof questionnaireResponses.$inferInsert;
export type QuestionnaireIdCounter = typeof questionnaireIdCounters.$inferSelect;
export type NewQuestionnaireIdCounter = typeof questionnaireIdCounters.$inferInsert;
