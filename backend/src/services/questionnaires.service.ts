/**
 * Questionnaires Service
 * Manages questionnaires for grouping polls with ordering and reward distribution
 */

import { db } from '../db/client';
import {
  questionnaires,
  questionnairePolls,
  questionnaireResponses,
  questionnaireIdCounters,
  QuestionnaireStatus,
  QuestionnaireSettings,
  PollRewardDistribution,
  Questionnaire,
  QuestionnairePoll,
  QuestionnaireResponse,
} from '../db/schema';
import { eq, and, desc, asc, sql, count } from 'drizzle-orm';

export interface CreateQuestionnaireInput {
  creatorAddress: string;
  chainId: number;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  startTime?: Date;
  endTime?: Date;
  totalRewardAmount?: string;
  fundingToken?: string;
  settings?: QuestionnaireSettings;
}

export interface UpdateQuestionnaireInput {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  startTime?: Date;
  endTime?: Date;
  totalRewardAmount?: string;
  fundingToken?: string;
  rewardDistribution?: PollRewardDistribution[];
  settings?: QuestionnaireSettings;
  status?: QuestionnaireStatus;
}

export interface AddPollInput {
  questionnaireId: string;
  chainId: number;
  pollId: number;
  sortOrder?: number;
  rewardPercentage?: string;
  source?: 'new' | 'existing';
}

export interface QuestionnaireWithPolls extends Questionnaire {
  polls: Array<{
    chainId: number;
    pollId: number;
    sortOrder: number;
    rewardPercentage: string | null;
    source: string;
    addedAt: Date;
  }>;
}

export class QuestionnairesService {
  /**
   * Get next on-chain ID for a chain
   */
  async getNextOnChainId(chainId: number): Promise<number> {
    // Try to get existing counter
    const [existing] = await db
      .select()
      .from(questionnaireIdCounters)
      .where(eq(questionnaireIdCounters.chainId, chainId))
      .limit(1);

    if (existing) {
      // Increment and return
      const nextId = existing.nextId + 1;
      await db
        .update(questionnaireIdCounters)
        .set({ nextId, updatedAt: new Date() })
        .where(eq(questionnaireIdCounters.chainId, chainId));
      return existing.nextId;
    }

    // Create new counter starting at 1
    await db.insert(questionnaireIdCounters).values({
      chainId,
      nextId: 2, // Next available will be 2
    });
    return 1;
  }

  /**
   * Create a new questionnaire
   */
  async createQuestionnaire(input: CreateQuestionnaireInput): Promise<Questionnaire> {
    // Get next on-chain ID
    const onChainId = await this.getNextOnChainId(input.chainId);

    const [questionnaire] = await db
      .insert(questionnaires)
      .values({
        onChainId: BigInt(onChainId),
        creatorAddress: input.creatorAddress.toLowerCase(),
        chainId: input.chainId,
        title: input.title,
        description: input.description,
        category: input.category,
        tags: input.tags,
        startTime: input.startTime,
        endTime: input.endTime,
        totalRewardAmount: input.totalRewardAmount || '0',
        fundingToken: input.fundingToken || '0x0000000000000000000000000000000000000000',
        settings: input.settings,
        status: 'active',
        pollCount: 0,
        completionCount: 0,
      })
      .returning();
    return questionnaire;
  }

  /**
   * Get questionnaire by ID
   */
  async getQuestionnaireById(id: string): Promise<Questionnaire | null> {
    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .where(eq(questionnaires.id, id))
      .limit(1);
    return questionnaire || null;
  }

  /**
   * Get questionnaire by on-chain ID and chain
   */
  async getQuestionnaireByOnChainId(chainId: number, onChainId: number): Promise<Questionnaire | null> {
    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .where(
        and(
          eq(questionnaires.chainId, chainId),
          eq(questionnaires.onChainId, BigInt(onChainId))
        )
      )
      .limit(1);
    return questionnaire || null;
  }

  /**
   * Get questionnaire with its polls
   */
  async getQuestionnaireWithPolls(id: string): Promise<QuestionnaireWithPolls | null> {
    const questionnaire = await this.getQuestionnaireById(id);
    if (!questionnaire) return null;

    const polls = await db
      .select({
        chainId: questionnairePolls.chainId,
        pollId: questionnairePolls.pollId,
        sortOrder: questionnairePolls.sortOrder,
        rewardPercentage: questionnairePolls.rewardPercentage,
        source: questionnairePolls.source,
        addedAt: questionnairePolls.addedAt,
      })
      .from(questionnairePolls)
      .where(eq(questionnairePolls.questionnaireId, id))
      .orderBy(asc(questionnairePolls.sortOrder), asc(questionnairePolls.addedAt));

    return {
      ...questionnaire,
      polls: polls.map(p => ({
        ...p,
        pollId: Number(p.pollId),
      })),
    };
  }

  /**
   * Get all questionnaires by a creator
   */
  async getQuestionnairesByCreator(
    creatorAddress: string,
    chainId?: number,
    status?: QuestionnaireStatus
  ): Promise<Questionnaire[]> {
    const conditions = [eq(questionnaires.creatorAddress, creatorAddress.toLowerCase())];

    if (chainId) {
      conditions.push(eq(questionnaires.chainId, chainId));
    }

    if (status) {
      conditions.push(eq(questionnaires.status, status));
    }

    return db
      .select()
      .from(questionnaires)
      .where(and(...conditions))
      .orderBy(desc(questionnaires.createdAt));
  }

  /**
   * Get all active questionnaires
   */
  async getActiveQuestionnaires(chainId?: number, limit = 20, offset = 0): Promise<Questionnaire[]> {
    const conditions = [eq(questionnaires.status, 'active')];

    if (chainId) {
      conditions.push(eq(questionnaires.chainId, chainId));
    }

    return db
      .select()
      .from(questionnaires)
      .where(and(...conditions))
      .orderBy(desc(questionnaires.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Update a questionnaire
   */
  async updateQuestionnaire(
    id: string,
    creatorAddress: string,
    input: UpdateQuestionnaireInput
  ): Promise<Questionnaire | null> {
    const [updated] = await db
      .update(questionnaires)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(questionnaires.id, id),
          eq(questionnaires.creatorAddress, creatorAddress.toLowerCase())
        )
      )
      .returning();
    return updated || null;
  }

  /**
   * Add a poll to a questionnaire
   */
  async addPollToQuestionnaire(input: AddPollInput): Promise<boolean> {
    try {
      // Check if poll already exists in questionnaire
      const existing = await db
        .select()
        .from(questionnairePolls)
        .where(
          and(
            eq(questionnairePolls.questionnaireId, input.questionnaireId),
            eq(questionnairePolls.chainId, input.chainId),
            eq(questionnairePolls.pollId, BigInt(input.pollId))
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return false; // Already exists
      }

      // Add poll to questionnaire
      await db.insert(questionnairePolls).values({
        questionnaireId: input.questionnaireId,
        chainId: input.chainId,
        pollId: BigInt(input.pollId),
        sortOrder: input.sortOrder ?? 0,
        rewardPercentage: input.rewardPercentage || '0',
        source: input.source || 'new',
      });

      // Update poll count
      await this.updateQuestionnaireStats(input.questionnaireId);

      return true;
    } catch (error) {
      console.error('Error adding poll to questionnaire:', error);
      return false;
    }
  }

  /**
   * Remove a poll from a questionnaire
   */
  async removePollFromQuestionnaire(questionnaireId: string, chainId: number, pollId: number): Promise<boolean> {
    const result = await db
      .delete(questionnairePolls)
      .where(
        and(
          eq(questionnairePolls.questionnaireId, questionnaireId),
          eq(questionnairePolls.chainId, chainId),
          eq(questionnairePolls.pollId, BigInt(pollId))
        )
      )
      .returning();

    if (result.length > 0) {
      await this.updateQuestionnaireStats(questionnaireId);
    }

    return result.length > 0;
  }

  /**
   * Update poll order in a questionnaire
   */
  async updatePollOrder(
    questionnaireId: string,
    pollOrders: Array<{ chainId: number; pollId: number; sortOrder: number }>
  ): Promise<boolean> {
    try {
      for (const order of pollOrders) {
        await db
          .update(questionnairePolls)
          .set({ sortOrder: order.sortOrder })
          .where(
            and(
              eq(questionnairePolls.questionnaireId, questionnaireId),
              eq(questionnairePolls.chainId, order.chainId),
              eq(questionnairePolls.pollId, BigInt(order.pollId))
            )
          );
      }
      return true;
    } catch (error) {
      console.error('Error updating poll order:', error);
      return false;
    }
  }

  /**
   * Update reward distribution for polls in a questionnaire
   */
  async updateRewardDistribution(
    questionnaireId: string,
    distribution: Array<{ chainId: number; pollId: number; percentage: string }>
  ): Promise<boolean> {
    try {
      for (const item of distribution) {
        await db
          .update(questionnairePolls)
          .set({ rewardPercentage: item.percentage })
          .where(
            and(
              eq(questionnairePolls.questionnaireId, questionnaireId),
              eq(questionnairePolls.chainId, item.chainId),
              eq(questionnairePolls.pollId, BigInt(item.pollId))
            )
          );
      }
      return true;
    } catch (error) {
      console.error('Error updating reward distribution:', error);
      return false;
    }
  }

  /**
   * Update questionnaire stats
   */
  async updateQuestionnaireStats(questionnaireId: string): Promise<void> {
    const [pollCountResult] = await db
      .select({ count: count() })
      .from(questionnairePolls)
      .where(eq(questionnairePolls.questionnaireId, questionnaireId));

    await db
      .update(questionnaires)
      .set({
        pollCount: pollCountResult?.count ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(questionnaires.id, questionnaireId));
  }

  /**
   * Record user starting a questionnaire
   */
  async startQuestionnaireResponse(questionnaireId: string, userAddress: string): Promise<QuestionnaireResponse> {
    // Check if response already exists
    const [existing] = await db
      .select()
      .from(questionnaireResponses)
      .where(
        and(
          eq(questionnaireResponses.questionnaireId, questionnaireId),
          eq(questionnaireResponses.userAddress, userAddress.toLowerCase())
        )
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    const [response] = await db
      .insert(questionnaireResponses)
      .values({
        questionnaireId,
        userAddress: userAddress.toLowerCase(),
        pollsAnswered: [],
        isComplete: false,
      })
      .returning();

    return response;
  }

  /**
   * Update user progress on a questionnaire
   */
  async updateQuestionnaireProgress(
    questionnaireId: string,
    userAddress: string,
    pollId: string
  ): Promise<QuestionnaireResponse | null> {
    const [existing] = await db
      .select()
      .from(questionnaireResponses)
      .where(
        and(
          eq(questionnaireResponses.questionnaireId, questionnaireId),
          eq(questionnaireResponses.userAddress, userAddress.toLowerCase())
        )
      )
      .limit(1);

    if (!existing) {
      return null;
    }

    const pollsAnswered = existing.pollsAnswered || [];
    if (!pollsAnswered.includes(pollId)) {
      pollsAnswered.push(pollId);
    }

    // Check if complete
    const questionnaire = await this.getQuestionnaireWithPolls(questionnaireId);
    const isComplete = questionnaire ? pollsAnswered.length >= questionnaire.polls.length : false;

    const [updated] = await db
      .update(questionnaireResponses)
      .set({
        pollsAnswered,
        isComplete,
        completedAt: isComplete ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(questionnaireResponses.questionnaireId, questionnaireId),
          eq(questionnaireResponses.userAddress, userAddress.toLowerCase())
        )
      )
      .returning();

    // Update completion count if just completed
    if (isComplete && !existing.isComplete) {
      await db
        .update(questionnaires)
        .set({
          completionCount: sql`${questionnaires.completionCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(questionnaires.id, questionnaireId));
    }

    return updated || null;
  }

  /**
   * Get user's progress on a questionnaire
   */
  async getUserProgress(questionnaireId: string, userAddress: string): Promise<QuestionnaireResponse | null> {
    const [response] = await db
      .select()
      .from(questionnaireResponses)
      .where(
        and(
          eq(questionnaireResponses.questionnaireId, questionnaireId),
          eq(questionnaireResponses.userAddress, userAddress.toLowerCase())
        )
      )
      .limit(1);

    return response || null;
  }

  /**
   * Get user's questionnaire responses
   */
  async getUserResponses(userAddress: string): Promise<QuestionnaireResponse[]> {
    return db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.userAddress, userAddress.toLowerCase()))
      .orderBy(desc(questionnaireResponses.startedAt));
  }

  /**
   * Get all polls that are in questionnaires for a creator
   * Returns a map of poll keys to questionnaire info
   */
  async getPollsInQuestionnaires(
    creatorAddress: string,
    chainId: number,
    excludeQuestionnaireId?: string
  ): Promise<Array<{
    chainId: number;
    pollId: number;
    questionnaireId: string;
    questionnaireTitle: string;
  }>> {
    // Get all questionnaires for the creator
    const creatorQuestionnaires = await db
      .select({
        id: questionnaires.id,
        title: questionnaires.title,
      })
      .from(questionnaires)
      .where(
        and(
          eq(questionnaires.creatorAddress, creatorAddress.toLowerCase()),
          eq(questionnaires.chainId, chainId)
        )
      );

    if (creatorQuestionnaires.length === 0) {
      return [];
    }

    // Filter out the excluded questionnaire if provided
    const questionnaireIds = creatorQuestionnaires
      .filter(q => !excludeQuestionnaireId || q.id !== excludeQuestionnaireId)
      .map(q => q.id);

    if (questionnaireIds.length === 0) {
      return [];
    }

    // Create a title map
    const titleMap = new Map(creatorQuestionnaires.map(q => [q.id, q.title]));

    // Get all polls in those questionnaires
    const pollsInQuestionnaires = await db
      .select({
        chainId: questionnairePolls.chainId,
        pollId: questionnairePolls.pollId,
        questionnaireId: questionnairePolls.questionnaireId,
      })
      .from(questionnairePolls)
      .where(sql`${questionnairePolls.questionnaireId} IN ${questionnaireIds}`);

    return pollsInQuestionnaires.map(p => ({
      chainId: p.chainId,
      pollId: Number(p.pollId),
      questionnaireId: p.questionnaireId,
      questionnaireTitle: titleMap.get(p.questionnaireId) || 'Unknown',
    }));
  }

  /**
   * Archive a questionnaire
   */
  async archiveQuestionnaire(id: string, creatorAddress: string): Promise<boolean> {
    const result = await db
      .update(questionnaires)
      .set({
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(questionnaires.id, id),
          eq(questionnaires.creatorAddress, creatorAddress.toLowerCase())
        )
      )
      .returning();
    return result.length > 0;
  }

  /**
   * Delete a questionnaire permanently
   */
  async deleteQuestionnaire(id: string, creatorAddress: string): Promise<boolean> {
    const result = await db
      .delete(questionnaires)
      .where(
        and(
          eq(questionnaires.id, id),
          eq(questionnaires.creatorAddress, creatorAddress.toLowerCase())
        )
      )
      .returning();
    return result.length > 0;
  }
}

export const questionnairesService = new QuestionnairesService();
