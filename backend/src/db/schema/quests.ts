/**
 * Quests Schema
 * Quest definitions and user progress tracking
 */

import { pgTable, uuid, text, integer, timestamp, boolean, jsonb, index, unique } from 'drizzle-orm/pg-core'
import { badges } from './badges'

/**
 * Quest requirement types
 */
export type QuestRequirementType =
  | 'poll_created'
  | 'vote_received'
  | 'poll_funded'
  | 'rewards_distributed'
  | 'votes_cast'
  | 'unique_voters'
  | 'total_funding'
  | 'polls_participated'

/**
 * Quest requirement structure (stored as JSONB)
 */
export interface QuestRequirement {
  type: QuestRequirementType
  target: number
  timeframe?: 'all_time' | 'daily' | 'weekly' | 'monthly'
}

/**
 * Quest categories
 */
export type QuestCategory = 'onboarding' | 'engagement' | 'milestone'

/**
 * Recurring periods for engagement quests
 */
export type RecurringPeriod = 'daily' | 'weekly' | 'monthly'

/**
 * Quest definitions - admin-configurable quest types
 */
export const questDefinitions = pgTable('QuestDefinition', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(), // 'onboarding' | 'engagement' | 'milestone'
  xpReward: integer('xpReward').default(0).notNull(),
  badgeId: uuid('badgeId').references(() => badges.id),
  isRecurring: boolean('isRecurring').default(false).notNull(),
  recurringPeriod: text('recurringPeriod'), // 'daily' | 'weekly' | 'monthly' | null
  requirements: jsonb('requirements').notNull().$type<QuestRequirement>(),
  displayOrder: integer('displayOrder').default(0).notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('QuestDef_slug_idx').on(table.slug),
  categoryIdx: index('QuestDef_category_idx').on(table.category),
  activeIdx: index('QuestDef_active_idx').on(table.isActive),
  orderIdx: index('QuestDef_order_idx').on(table.displayOrder),
}))

/**
 * User quest progress - tracks each user's progress on quests
 */
export const userQuests = pgTable('UserQuest', {
  id: uuid('id').defaultRandom().primaryKey(),
  address: text('address').notNull(),
  questId: uuid('questId').references(() => questDefinitions.id).notNull(),
  progress: integer('progress').default(0).notNull(),
  target: integer('target').notNull(),
  isCompleted: boolean('isCompleted').default(false).notNull(),
  completedAt: timestamp('completedAt'),
  periodStart: timestamp('periodStart'), // For recurring quests - start of current period
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  addressIdx: index('UserQuest_address_idx').on(table.address),
  questIdx: index('UserQuest_questId_idx').on(table.questId),
  completedIdx: index('UserQuest_completed_idx').on(table.isCompleted),
  // Unique constraint: one active quest progress per user per quest per period
  uniqueUserQuest: unique('UserQuest_address_quest_period_key').on(
    table.address,
    table.questId,
    table.periodStart
  ),
}))

// Type exports
export type QuestDefinition = typeof questDefinitions.$inferSelect
export type NewQuestDefinition = typeof questDefinitions.$inferInsert
export type UserQuest = typeof userQuests.$inferSelect
export type NewUserQuest = typeof userQuests.$inferInsert
