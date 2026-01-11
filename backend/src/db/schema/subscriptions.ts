import { pgTable, uuid, integer, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

/**
 * Subscription schema - tracks premium subscriptions
 */
export const subscriptions = pgTable('Subscription', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chainId').notNull(),
  address: text('address').notNull(), // User's wallet address
  tier: text('tier').notNull(), // 'MONTHLY' | 'ANNUAL' | 'LIFETIME'
  expirationTime: timestamp('expirationTime'), // null for lifetime
  purchaseTime: timestamp('purchaseTime').notNull(),
  purchasePrice: text('purchasePrice').notNull(), // Price paid in PULSE
  transactionHash: text('transactionHash'),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  chainIdIdx: index('Subscription_chainId_idx').on(table.chainId),
  addressIdx: index('Subscription_address_idx').on(table.address),
  chainAddressIdx: index('Subscription_chainId_address_idx').on(table.chainId, table.address),
  tierIdx: index('Subscription_tier_idx').on(table.tier),
  isActiveIdx: index('Subscription_isActive_idx').on(table.isActive),
}));

/**
 * Subscription events log - tracks subscription purchases and extensions
 */
export const subscriptionEvents = pgTable('SubscriptionEvent', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chainId').notNull(),
  address: text('address').notNull(),
  eventType: text('eventType').notNull(), // 'PURCHASE' | 'EXTEND' | 'EXPIRE'
  tier: text('tier').notNull(),
  price: text('price').notNull(),
  transactionHash: text('transactionHash'),
  blockNumber: text('blockNumber'),
  timestamp: timestamp('timestamp').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  chainIdIdx: index('SubscriptionEvent_chainId_idx').on(table.chainId),
  addressIdx: index('SubscriptionEvent_address_idx').on(table.address),
  eventTypeIdx: index('SubscriptionEvent_eventType_idx').on(table.eventType),
}));

/**
 * Global subscription stats cache
 */
export const subscriptionStats = pgTable('SubscriptionStats', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chainId').notNull().unique(),
  totalSubscribers: integer('totalSubscribers').default(0).notNull(),
  monthlySubscribers: integer('monthlySubscribers').default(0).notNull(),
  annualSubscribers: integer('annualSubscribers').default(0).notNull(),
  lifetimeSubscribers: integer('lifetimeSubscribers').default(0).notNull(),
  totalRevenue: text('totalRevenue').default('0').notNull(), // Total PULSE earned
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
export type NewSubscriptionEvent = typeof subscriptionEvents.$inferInsert;
export type SubscriptionStatsType = typeof subscriptionStats.$inferSelect;
export type NewSubscriptionStats = typeof subscriptionStats.$inferInsert;
