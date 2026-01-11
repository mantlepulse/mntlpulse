/**
 * User Levels Schema
 * XP and level tracking for the quests system
 */

import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core'

/**
 * User levels - tracks XP and level for each user
 */
export const userLevels = pgTable('UserLevel', {
  id: uuid('id').defaultRandom().primaryKey(),
  address: text('address').unique().notNull(),
  totalXp: integer('totalXp').default(0).notNull(),
  level: integer('level').default(1).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  addressIdx: index('UserLevel_address_idx').on(table.address),
  xpIdx: index('UserLevel_totalXp_idx').on(table.totalXp),
  levelIdx: index('UserLevel_level_idx').on(table.level),
}))

/**
 * Level thresholds - defines XP required for each level
 */
export const levelThresholds = pgTable('LevelThreshold', {
  level: integer('level').primaryKey(),
  xpRequired: integer('xpRequired').notNull(),
  title: text('title').notNull(), // e.g., 'Novice', 'Apprentice', 'Master'
})

// Type exports
export type UserLevel = typeof userLevels.$inferSelect
export type NewUserLevel = typeof userLevels.$inferInsert
export type LevelThreshold = typeof levelThresholds.$inferSelect
export type NewLevelThreshold = typeof levelThresholds.$inferInsert
