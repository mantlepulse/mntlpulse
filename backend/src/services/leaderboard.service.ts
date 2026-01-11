/**
 * Leaderboard Service for user rankings and statistics
 */

import { db } from '../db/client';
import { leaderboard } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { Address } from 'viem';

export class LeaderboardService {
  /**
   * Get top users by total rewards
   */
  async getTopByRewards(limit: number = 10, offset: number = 0) {
    return db
      .select()
      .from(leaderboard)
      .orderBy(desc(sql`${leaderboard.totalRewards}::numeric`))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get top users by total votes
   */
  async getTopByVotes(limit: number = 10, offset: number = 0) {
    return db
      .select()
      .from(leaderboard)
      .orderBy(desc(leaderboard.totalVotes))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get top users by polls created
   */
  async getTopByPollsCreated(limit: number = 10, offset: number = 0) {
    return db
      .select()
      .from(leaderboard)
      .orderBy(desc(leaderboard.pollsCreated))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get top users by polls participated
   */
  async getTopByParticipation(limit: number = 10, offset: number = 0) {
    return db
      .select()
      .from(leaderboard)
      .orderBy(desc(leaderboard.pollsParticipated))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get user statistics by address
   */
  async getUserStats(address: Address) {
    const [stats] = await db
      .select()
      .from(leaderboard)
      .where(eq(leaderboard.address, address.toLowerCase()))
      .limit(1);

    return stats || {
      address: address.toLowerCase(),
      totalRewards: '0',
      pollsParticipated: 0,
      totalVotes: 0,
      pollsCreated: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get user's rank by rewards
   */
  async getUserRankByRewards(address: Address) {
    const result = await db.execute(sql`
      SELECT COUNT(*) + 1 as rank
      FROM ${leaderboard}
      WHERE ${leaderboard.totalRewards}::numeric > (
        SELECT ${leaderboard.totalRewards}::numeric
        FROM ${leaderboard}
        WHERE ${leaderboard.address} = ${address.toLowerCase()}
      )
    `);

    return (result[0] as any)?.rank || null;
  }

  /**
   * Get user's rank by votes
   */
  async getUserRankByVotes(address: Address) {
    const result = await db.execute(sql`
      SELECT COUNT(*) + 1 as rank
      FROM ${leaderboard}
      WHERE ${leaderboard.totalVotes} > (
        SELECT ${leaderboard.totalVotes}
        FROM ${leaderboard}
        WHERE ${leaderboard.address} = ${address.toLowerCase()}
      )
    `);

    return (result[0] as any)?.rank || null;
  }

  /**
   * Get comprehensive leaderboard with all rankings
   */
  async getComprehensive(limit: number = 10) {
    const [byRewards, byVotes, byPollsCreated, byParticipation] = await Promise.all([
      this.getTopByRewards(limit),
      this.getTopByVotes(limit),
      this.getTopByPollsCreated(limit),
      this.getTopByParticipation(limit),
    ]);

    return {
      topByRewards: byRewards,
      topByVotes: byVotes,
      topByPollsCreated: byPollsCreated,
      topByParticipation: byParticipation,
    };
  }

  /**
   * Get total statistics
   */
  async getTotalStats() {
    const result = await db
      .select({
        totalUsers: sql<number>`COUNT(*)`,
        totalRewardsDistributed: sql<string>`SUM(${leaderboard.totalRewards}::numeric)`,
        totalVotes: sql<number>`SUM(${leaderboard.totalVotes})`,
        totalPolls: sql<number>`SUM(${leaderboard.pollsCreated})`,
      })
      .from(leaderboard);

    return result[0] || {
      totalUsers: 0,
      totalRewardsDistributed: '0',
      totalVotes: 0,
      totalPolls: 0,
    };
  }
}

// Export singleton instance
export const leaderboardService = new LeaderboardService();
