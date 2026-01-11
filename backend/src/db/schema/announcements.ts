import { pgTable, text, timestamp, boolean, integer, uuid } from 'drizzle-orm/pg-core';

/**
 * Announcements table for managing site-wide announcements
 */
export const announcements = pgTable('Announcement', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  link: text('link'),
  linkText: text('linkText').default('Learn More'),
  status: text('status').notNull().default('draft'), // draft, published, archived
  startDate: timestamp('startDate'),
  endDate: timestamp('endDate'),
  dismissible: boolean('dismissible').default(true).notNull(),
  priority: integer('priority').default(1).notNull(),
  createdBy: text('createdBy').notNull(), // Wallet address of creator
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
