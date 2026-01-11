import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const userPreferences = pgTable('UserPreference', {
  id: uuid('id').defaultRandom().primaryKey(),
  address: text('address').unique().notNull(),
  preferredToken: text('preferredToken'), // "USDT", "BTC", etc.
  autoClaimEnabled: boolean('autoClaimEnabled').default(false).notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  addressIdx: index('UserPreference_address_idx').on(table.address),
}));

export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
