/**
 * Creator Quests Service
 * Manages quests created by creators for their audience
 */

import { db } from '../db/client';
import {
  creatorQuests,
  creatorQuestParticipations,
  creatorQuestShareProofs,
  CreatorQuestType,
  CreatorQuestRequirement,
  SharePlatform,
} from '../db/schema';
import { eq, and, desc, asc, sql, gte, lte, or, isNull, count } from 'drizzle-orm';
import { pointsService } from './points.service';

export interface CreateQuestInput {
  creatorAddress: string;
  name: string;
  description: string;
  questType: CreatorQuestType;
  requirements: CreatorQuestRequirement;
  pointsReward: number;
  maxCompletions?: number;
  pollScope?: 'all' | 'specific';
  specificPollIds?: string[];
  seasonId?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface UpdateQuestInput {
  name?: string;
  description?: string;
  pointsReward?: number;
  maxCompletions?: number;
  isActive?: boolean;
  startTime?: Date;
  endTime?: Date;
}

export class CreatorQuestsService {
  /**
   * Create a new quest
   */
  async createQuest(input: CreateQuestInput) {
    const [quest] = await db
      .insert(creatorQuests)
      .values({
        creatorAddress: input.creatorAddress.toLowerCase(),
        name: input.name,
        description: input.description,
        questType: input.questType,
        requirements: input.requirements,
        pointsReward: input.pointsReward,
        maxCompletions: input.maxCompletions,
        pollScope: input.pollScope || 'all',
        specificPollIds: input.specificPollIds,
        seasonId: input.seasonId,
        startTime: input.startTime,
        endTime: input.endTime,
        isActive: true,
      })
      .returning();
    return quest;
  }

  /**
   * Get quest by ID
   */
  async getQuestById(id: string) {
    const [quest] = await db
      .select()
      .from(creatorQuests)
      .where(eq(creatorQuests.id, id))
      .limit(1);
    return quest;
  }

  /**
   * Get all quests by a creator
   */
  async getQuestsByCreator(creatorAddress: string) {
    return db
      .select()
      .from(creatorQuests)
      .where(eq(creatorQuests.creatorAddress, creatorAddress.toLowerCase()))
      .orderBy(desc(creatorQuests.createdAt));
  }

  /**
   * Get active quests available for a participant
   */
  async getAvailableQuests(participantAddress?: string) {
    const now = new Date();
    const normalizedParticipant = participantAddress?.toLowerCase();

    // Get active quests within time range
    const quests = await db
      .select()
      .from(creatorQuests)
      .where(
        and(
          eq(creatorQuests.isActive, true),
          or(isNull(creatorQuests.startTime), lte(creatorQuests.startTime, now)),
          or(isNull(creatorQuests.endTime), gte(creatorQuests.endTime, now)),
          or(
            isNull(creatorQuests.maxCompletions),
            sql`${creatorQuests.currentCompletions} < ${creatorQuests.maxCompletions}`
          )
        )
      )
      .orderBy(desc(creatorQuests.createdAt));

    if (!normalizedParticipant) {
      return quests.map((q) => ({ ...q, participation: null }));
    }

    // Get participant's progress for each quest
    const questsWithProgress = await Promise.all(
      quests.map(async (quest) => {
        const [participation] = await db
          .select()
          .from(creatorQuestParticipations)
          .where(
            and(
              eq(creatorQuestParticipations.questId, quest.id),
              eq(creatorQuestParticipations.participantAddress, normalizedParticipant)
            )
          )
          .limit(1);
        return { ...quest, participation };
      })
    );

    return questsWithProgress;
  }

  /**
   * Update a quest
   */
  async updateQuest(id: string, creatorAddress: string, updates: UpdateQuestInput) {
    const [updated] = await db
      .update(creatorQuests)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(creatorQuests.id, id),
          eq(creatorQuests.creatorAddress, creatorAddress.toLowerCase())
        )
      )
      .returning();
    return updated;
  }

  /**
   * Deactivate a quest
   */
  async deactivateQuest(id: string, creatorAddress: string) {
    return this.updateQuest(id, creatorAddress, { isActive: false });
  }

  /**
   * Get quest participants
   */
  async getQuestParticipants(questId: string, options?: { completed?: boolean }) {
    const conditions = [eq(creatorQuestParticipations.questId, questId)];

    if (options?.completed !== undefined) {
      conditions.push(eq(creatorQuestParticipations.isCompleted, options.completed));
    }

    return db
      .select()
      .from(creatorQuestParticipations)
      .where(and(...conditions))
      .orderBy(desc(creatorQuestParticipations.updatedAt));
  }

  /**
   * Get or create participation record
   */
  async getOrCreateParticipation(questId: string, participantAddress: string) {
    const normalizedAddress = participantAddress.toLowerCase();

    const [existing] = await db
      .select()
      .from(creatorQuestParticipations)
      .where(
        and(
          eq(creatorQuestParticipations.questId, questId),
          eq(creatorQuestParticipations.participantAddress, normalizedAddress)
        )
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    // Get quest to determine target
    const quest = await this.getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    const [created] = await db
      .insert(creatorQuestParticipations)
      .values({
        questId,
        participantAddress: normalizedAddress,
        progress: 0,
        target: quest.requirements.target,
      })
      .returning();

    return created;
  }

  /**
   * Update participation progress
   */
  async updateProgress(questId: string, participantAddress: string, newProgress: number) {
    const normalizedAddress = participantAddress.toLowerCase();
    const participation = await this.getOrCreateParticipation(questId, normalizedAddress);
    const quest = await this.getQuestById(questId);

    if (!quest || !quest.isActive) {
      return { updated: false, reason: 'Quest not found or inactive' };
    }

    if (participation.isCompleted) {
      return { updated: false, reason: 'Already completed' };
    }

    // Check if quest has reached max completions
    if (quest.maxCompletions && quest.currentCompletions >= quest.maxCompletions) {
      return { updated: false, reason: 'Quest max completions reached' };
    }

    const isNowCompleted = newProgress >= participation.target;

    const [updated] = await db
      .update(creatorQuestParticipations)
      .set({
        progress: Math.min(newProgress, participation.target),
        isCompleted: isNowCompleted,
        completedAt: isNowCompleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(creatorQuestParticipations.id, participation.id))
      .returning();

    // If completed, award points and increment quest completion count
    if (isNowCompleted && !participation.isCompleted) {
      // Increment quest completion count
      await db
        .update(creatorQuests)
        .set({
          currentCompletions: sql`${creatorQuests.currentCompletions} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(creatorQuests.id, questId));

      // Award points if quest has a season
      if (quest.seasonId) {
        const pointsResult = await pointsService.awardPoints({
          address: normalizedAddress,
          seasonId: quest.seasonId,
          amount: quest.pointsReward,
          type: 'quest_reward',
          questId: quest.id,
          description: `Completed quest: ${quest.name}`,
        });

        // Update points awarded in participation
        await db
          .update(creatorQuestParticipations)
          .set({ pointsAwarded: pointsResult.pointsAwarded })
          .where(eq(creatorQuestParticipations.id, participation.id));

        return { updated: true, completed: true, pointsAwarded: pointsResult.pointsAwarded };
      }

      return { updated: true, completed: true, pointsAwarded: quest.pointsReward };
    }

    return { updated: true, completed: false, participation: updated };
  }

  /**
   * Increment progress by 1 (convenience method)
   */
  async incrementProgress(questId: string, participantAddress: string) {
    const participation = await this.getOrCreateParticipation(questId, participantAddress);
    return this.updateProgress(questId, participantAddress, participation.progress + 1);
  }

  /**
   * Get participant's quests with progress
   */
  async getParticipantQuests(participantAddress: string) {
    const normalizedAddress = participantAddress.toLowerCase();

    const participations = await db
      .select({
        participation: creatorQuestParticipations,
        quest: creatorQuests,
      })
      .from(creatorQuestParticipations)
      .innerJoin(creatorQuests, eq(creatorQuestParticipations.questId, creatorQuests.id))
      .where(eq(creatorQuestParticipations.participantAddress, normalizedAddress))
      .orderBy(desc(creatorQuestParticipations.updatedAt));

    return participations;
  }

  /**
   * Delete a quest (only if no completions)
   */
  async deleteQuest(id: string, creatorAddress: string) {
    const quest = await this.getQuestById(id);
    if (!quest) {
      throw new Error('Quest not found');
    }
    if (quest.creatorAddress !== creatorAddress.toLowerCase()) {
      throw new Error('Not authorized');
    }
    if (quest.currentCompletions > 0) {
      throw new Error('Cannot delete quest with completions');
    }

    // Delete participations first
    await db
      .delete(creatorQuestParticipations)
      .where(eq(creatorQuestParticipations.questId, id));

    // Delete quest
    await db.delete(creatorQuests).where(eq(creatorQuests.id, id));

    return true;
  }

  /**
   * Submit share proof for a share_poll quest
   */
  async submitShareProof(input: {
    questId: string;
    participantAddress: string;
    pollId: string;
    platform: SharePlatform;
    shareUrl: string;
  }) {
    const normalizedAddress = input.participantAddress.toLowerCase();
    const quest = await this.getQuestById(input.questId);

    if (!quest) {
      throw new Error('Quest not found');
    }

    if (!quest.isActive) {
      throw new Error('Quest is not active');
    }

    if (quest.requirements.type !== 'share_poll') {
      throw new Error('Quest is not a share_poll type');
    }

    // Check if this share already exists
    const [existingShare] = await db
      .select()
      .from(creatorQuestShareProofs)
      .where(
        and(
          eq(creatorQuestShareProofs.questId, input.questId),
          eq(creatorQuestShareProofs.participantAddress, normalizedAddress),
          eq(creatorQuestShareProofs.pollId, input.pollId),
          eq(creatorQuestShareProofs.platform, input.platform)
        )
      )
      .limit(1);

    if (existingShare) {
      throw new Error('Share already submitted for this poll and platform');
    }

    // Insert the share proof
    const [shareProof] = await db
      .insert(creatorQuestShareProofs)
      .values({
        questId: input.questId,
        participantAddress: normalizedAddress,
        pollId: input.pollId,
        platform: input.platform,
        shareUrl: input.shareUrl,
        isVerified: true, // Auto-verify for now (URL format validated on frontend)
        verifiedAt: new Date(),
      })
      .returning();

    // Count total verified shares for this quest
    const [shareCount] = await db
      .select({ count: count() })
      .from(creatorQuestShareProofs)
      .where(
        and(
          eq(creatorQuestShareProofs.questId, input.questId),
          eq(creatorQuestShareProofs.participantAddress, normalizedAddress),
          eq(creatorQuestShareProofs.isVerified, true)
        )
      );

    // Update quest progress
    const progressResult = await this.updateProgress(
      input.questId,
      normalizedAddress,
      shareCount?.count || 1
    );

    return {
      shareProof,
      progress: progressResult,
    };
  }

  /**
   * Get share proofs for a participant's quest
   */
  async getShareProofs(questId: string, participantAddress: string) {
    const normalizedAddress = participantAddress.toLowerCase();
    return db
      .select()
      .from(creatorQuestShareProofs)
      .where(
        and(
          eq(creatorQuestShareProofs.questId, questId),
          eq(creatorQuestShareProofs.participantAddress, normalizedAddress)
        )
      )
      .orderBy(desc(creatorQuestShareProofs.createdAt));
  }
}

export const creatorQuestsService = new CreatorQuestsService();
