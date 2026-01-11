import { pgTable, uuid, text, integer, timestamp, index, unique, boolean, jsonb } from 'drizzle-orm/pg-core';
import { seasons } from './seasons';

/**
 * Quest types
 */
export type CreatorQuestType = 'participation' | 'engagement_goal';

/**
 * Quest requirement types
 */
export type CreatorQuestRequirementType =
  | 'vote_on_polls'          // Vote on X polls by creator
  | 'vote_on_specific_poll'  // Vote on specific poll(s)
  | 'share_poll'             // Share poll (social proof)
  | 'first_n_voters'         // Be among first N voters
  | 'participate_n_polls';   // Participate in N polls

/**
 * Quest requirements structure
 */
export interface CreatorQuestRequirement {
  type: CreatorQuestRequirementType;
  target: number;
  pollIds?: string[];  // Specific polls (for poll-specific quests)
}

/**
 * Creator quests - quests created by creators for their audience
 */
export const creatorQuests = pgTable('CreatorQuest', {
  id: uuid('id').defaultRandom().primaryKey(),
  creatorAddress: text('creatorAddress').notNull(), // Creator wallet address
  // Quest details
  name: text('name').notNull(),
  description: text('description').notNull(),
  questType: text('questType').notNull().$type<CreatorQuestType>(),
  // Quest configuration
  requirements: jsonb('requirements').$type<CreatorQuestRequirement>().notNull(),
  // Points allocation
  pointsReward: integer('pointsReward').notNull(),
  maxCompletions: integer('maxCompletions'), // null = unlimited
  currentCompletions: integer('currentCompletions').default(0).notNull(),
  // Scope - which polls this quest applies to
  pollScope: text('pollScope').default('all').notNull(), // 'all' | 'specific'
  specificPollIds: jsonb('specificPollIds').$type<string[]>(),
  // Season/epoch linking
  seasonId: uuid('seasonId').references(() => seasons.id),
  // Status
  isActive: boolean('isActive').default(true).notNull(),
  startTime: timestamp('startTime'),
  endTime: timestamp('endTime'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('CreatorQuest_creator_idx').on(table.creatorAddress),
  typeIdx: index('CreatorQuest_type_idx').on(table.questType),
  seasonIdx: index('CreatorQuest_season_idx').on(table.seasonId),
  activeIdx: index('CreatorQuest_active_idx').on(table.isActive),
}));

/**
 * Creator quest participations - tracks participant progress on quests
 */
export const creatorQuestParticipations = pgTable('CreatorQuestParticipation', {
  id: uuid('id').defaultRandom().primaryKey(),
  questId: uuid('questId').references(() => creatorQuests.id).notNull(),
  participantAddress: text('participantAddress').notNull(),
  // Progress tracking
  progress: integer('progress').default(0).notNull(),
  target: integer('target').notNull(),
  isCompleted: boolean('isCompleted').default(false).notNull(),
  completedAt: timestamp('completedAt'),
  // Points awarded
  pointsAwarded: integer('pointsAwarded').default(0).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  questParticipantIdx: unique('CreatorQuestParticipation_quest_participant_key').on(table.questId, table.participantAddress),
  questIdx: index('CreatorQuestParticipation_quest_idx').on(table.questId),
  participantIdx: index('CreatorQuestParticipation_participant_idx').on(table.participantAddress),
  completedIdx: index('CreatorQuestParticipation_completed_idx').on(table.isCompleted),
}));

/**
 * Share platform types for share_poll quest verification
 */
export type SharePlatform = 'twitter' | 'facebook' | 'linkedin' | 'farcaster';

/**
 * Creator quest share proofs - tracks poll shares for verification
 */
export const creatorQuestShareProofs = pgTable('CreatorQuestShareProof', {
  id: uuid('id').defaultRandom().primaryKey(),
  questId: uuid('questId').references(() => creatorQuests.id).notNull(),
  participantAddress: text('participantAddress').notNull(),
  pollId: text('pollId').notNull(), // On-chain poll ID
  platform: text('platform').notNull().$type<SharePlatform>(),
  shareUrl: text('shareUrl').notNull(),
  isVerified: boolean('isVerified').default(false).notNull(),
  verifiedAt: timestamp('verifiedAt'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  questParticipantIdx: index('CreatorQuestShareProof_quest_participant_idx').on(table.questId, table.participantAddress),
  pollIdx: index('CreatorQuestShareProof_poll_idx').on(table.pollId),
  uniqueShare: unique('CreatorQuestShareProof_unique_share').on(table.questId, table.participantAddress, table.pollId, table.platform),
}));

// Type exports
export type CreatorQuest = typeof creatorQuests.$inferSelect;
export type NewCreatorQuest = typeof creatorQuests.$inferInsert;
export type CreatorQuestParticipation = typeof creatorQuestParticipations.$inferSelect;
export type NewCreatorQuestParticipation = typeof creatorQuestParticipations.$inferInsert;
export type CreatorQuestShareProof = typeof creatorQuestShareProofs.$inferSelect;
export type NewCreatorQuestShareProof = typeof creatorQuestShareProofs.$inferInsert;
