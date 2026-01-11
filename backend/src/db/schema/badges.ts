/**
 * Badges Schema
 * Badge definitions and user badge tracking for the quests system
 */

import { pgTable, uuid, text, timestamp, boolean, index, unique } from 'drizzle-orm/pg-core'

/**
 * Badge definitions - admin-configurable badge types
 */
export const badges = pgTable('Badge', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  imageUrl: text('imageUrl').notNull(),
  rarity: text('rarity').notNull(), // 'common' | 'rare' | 'epic' | 'legendary'
  // Future on-chain NFT support
  tokenId: text('tokenId'),
  contractAddress: text('contractAddress'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('Badge_slug_idx').on(table.slug),
  rarityIdx: index('Badge_rarity_idx').on(table.rarity),
}))

/**
 * User badges - tracks which badges each user has earned
 */
export const userBadges = pgTable('UserBadge', {
  id: uuid('id').defaultRandom().primaryKey(),
  address: text('address').notNull(),
  badgeId: uuid('badgeId').references(() => badges.id).notNull(),
  earnedAt: timestamp('earnedAt').defaultNow().notNull(),
  // Future on-chain claim support
  claimed: boolean('claimed').default(false).notNull(),
  claimTxHash: text('claimTxHash'),
}, (table) => ({
  addressIdx: index('UserBadge_address_idx').on(table.address),
  badgeIdx: index('UserBadge_badgeId_idx').on(table.badgeId),
  uniqueUserBadge: unique('UserBadge_address_badge_key').on(table.address, table.badgeId),
}))

// Type exports
export type Badge = typeof badges.$inferSelect
export type NewBadge = typeof badges.$inferInsert
export type UserBadge = typeof userBadges.$inferSelect
export type NewUserBadge = typeof userBadges.$inferInsert
