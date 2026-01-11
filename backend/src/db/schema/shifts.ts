import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';

export const shifts = pgTable('Shift', {
  id: uuid('id').defaultRandom().primaryKey(),
  sideshiftOrderId: text('sideshiftOrderId').unique().notNull(),
  pollId: text('pollId').notNull(),
  userAddress: text('userAddress').notNull(),
  purpose: text('purpose').notNull(), // "fund_poll" | "claim_reward"

  sourceAsset: text('sourceAsset').notNull(),
  destAsset: text('destAsset').notNull(),
  sourceNetwork: text('sourceNetwork').notNull(),
  destNetwork: text('destNetwork').notNull(),
  sourceAmount: text('sourceAmount'),
  destAmount: text('destAmount'),

  depositAddress: text('depositAddress').notNull(),
  settleAddress: text('settleAddress').notNull(),

  shiftType: text('shiftType').notNull(), // "fixed" | "variable"
  status: text('status').notNull(), // SideShift shift status

  depositTxHash: text('depositTxHash'),
  settleTxHash: text('settleTxHash'),
  contractTxHash: text('contractTxHash'), // Our contract interaction tx
  fundingTxHash: text('fundingTxHash'), // Transaction hash when user funds the poll

  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  completedAt: timestamp('completedAt'),
  expiresAt: timestamp('expiresAt').notNull(),
}, (table) => ({
  userAddressIdx: index('Shift_userAddress_idx').on(table.userAddress),
  pollIdIdx: index('Shift_pollId_idx').on(table.pollId),
  statusIdx: index('Shift_status_idx').on(table.status),
  purposeIdx: index('Shift_purpose_idx').on(table.purpose),
  createdAtIdx: index('Shift_createdAt_idx').on(table.createdAt),
  fundingTxHashIdx: index('Shift_fundingTxHash_idx').on(table.fundingTxHash),
}));

export type Shift = typeof shifts.$inferSelect;
export type NewShift = typeof shifts.$inferInsert;
