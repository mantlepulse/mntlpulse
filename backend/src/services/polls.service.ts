/**
 * Polls Service for managing poll data
 */

import { db } from '../db/client';
import { polls, distributionLogs } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export class PollsService {
  /**
   * Get all polls with optional filters
   */
  async getAll(filters?: {
    chainId?: number;
    isActive?: boolean;
    creator?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = db.select().from(polls);

    if (filters?.chainId) {
      query = query.where(eq(polls.chainId, filters.chainId)) as any;
    }

    const results = await query
      .orderBy(desc(polls.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return results;
  }

  /**
   * Get poll by ID
   */
  async getById(id: string) {
    const [poll] = await db
      .select()
      .from(polls)
      .where(eq(polls.id, id))
      .limit(1);

    return poll || null;
  }

  /**
   * Get poll by chain ID and poll ID
   */
  async getByChainAndPollId(chainId: number, pollId: bigint) {
    const [poll] = await db
      .select()
      .from(polls)
      .where(and(eq(polls.chainId, chainId), eq(polls.pollId, pollId)))
      .limit(1);

    return poll || null;
  }

  /**
   * Get poll with distribution logs
   */
  async getWithDistributions(id: string) {
    const poll = await this.getById(id);
    if (!poll) return null;

    const distributions = await db
      .select()
      .from(distributionLogs)
      .where(eq(distributionLogs.pollId, id))
      .orderBy(desc(distributionLogs.timestamp));

    return {
      ...poll,
      distributions,
    };
  }

  /**
   * Update poll distribution mode
   */
  async updateDistributionMode(
    id: string,
    mode: 'MANUAL_PULL' | 'MANUAL_PUSH' | 'AUTOMATED'
  ) {
    const [updated] = await db
      .update(polls)
      .set({
        distributionMode: mode,
        updatedAt: new Date(),
      })
      .where(eq(polls.id, id))
      .returning();

    return updated;
  }

  /**
   * Update poll display title (off-chain override)
   */
  async updateDisplayTitle(id: string, displayTitle: string | null) {
    const [updated] = await db
      .update(polls)
      .set({
        displayTitle,
        updatedAt: new Date(),
      })
      .where(eq(polls.id, id))
      .returning();

    return updated;
  }

  /**
   * Get poll by chain ID and poll ID, creating if not exists
   * Used when we need to ensure a poll record exists for updates
   */
  async getOrCreateByChainAndPollId(chainId: number, pollId: bigint) {
    let poll = await this.getByChainAndPollId(chainId, pollId);

    if (!poll) {
      // Create the poll record
      const [newPoll] = await db
        .insert(polls)
        .values({
          chainId,
          pollId,
          distributionMode: 'MANUAL_PULL',
        })
        .returning();
      poll = newPoll;
    }

    return poll;
  }

  /**
   * Get distribution logs for a poll
   */
  async getDistributions(pollId: string) {
    return db
      .select()
      .from(distributionLogs)
      .where(eq(distributionLogs.pollId, pollId))
      .orderBy(desc(distributionLogs.timestamp));
  }

  /**
   * Get polls by creator address (requires joining with blockchain data)
   */
  async getByCreator(creatorAddress: string, chainId?: number) {
    let query = db.select().from(polls);

    if (chainId) {
      query = query.where(eq(polls.chainId, chainId)) as any;
    }

    // Note: This returns all polls - frontend/caller should filter by creator
    // since creator address is not stored in our database table
    return query.orderBy(desc(polls.createdAt));
  }

  /**
   * Get poll statistics
   */
  async getStats(pollId: string) {
    const distributions = await db
      .select({
        totalDistributed: sql<string>`SUM(${distributionLogs.amount})`,
        distributionCount: sql<number>`COUNT(*)`,
        uniqueRecipients: sql<number>`COUNT(DISTINCT ${distributionLogs.recipient})`,
      })
      .from(distributionLogs)
      .where(eq(distributionLogs.pollId, pollId));

    return distributions[0] || {
      totalDistributed: '0',
      distributionCount: 0,
      uniqueRecipients: 0,
    };
  }
}

// Export singleton instance
export const pollsService = new PollsService();
