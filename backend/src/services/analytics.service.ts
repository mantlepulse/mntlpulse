/**
 * Analytics Service for poll and platform statistics
 */

import { db } from '../db/client';
import { polls, distributionLogs, leaderboard } from '../db/schema';
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';

export class AnalyticsService {
  /**
   * Get system-wide overview statistics
   */
  async getOverview() {
    const [pollStats, pollsByChain, distributionStats, distributionsByType, userStats] = await Promise.all([
      // Poll statistics - total count
      db
        .select({
          totalPolls: sql<number>`COUNT(*)`,
        })
        .from(polls),

      // Polls grouped by chain
      db
        .select({
          chainId: polls.chainId,
          count: sql<number>`COUNT(*)`,
        })
        .from(polls)
        .groupBy(polls.chainId),

      // Distribution statistics - totals
      db
        .select({
          totalDistributions: sql<number>`COUNT(*)`,
          totalAmount: sql<string>`COALESCE(SUM(${distributionLogs.amount}::numeric), 0)`,
          uniqueRecipients: sql<number>`COUNT(DISTINCT ${distributionLogs.recipient})`,
        })
        .from(distributionLogs),

      // Distributions grouped by event type
      db
        .select({
          type: distributionLogs.eventType,
          count: sql<number>`COUNT(*)`,
        })
        .from(distributionLogs)
        .groupBy(distributionLogs.eventType),

      // User statistics
      db
        .select({
          totalUsers: sql<number>`COUNT(*)`,
          totalRewards: sql<string>`COALESCE(SUM(${leaderboard.totalRewards}::numeric), 0)`,
          totalVotes: sql<number>`COALESCE(SUM(${leaderboard.totalVotes}), 0)`,
          activeUsers: sql<number>`COUNT(*) FILTER (WHERE ${leaderboard.totalVotes} > 0)`,
        })
        .from(leaderboard),
    ]);

    return {
      polls: {
        totalPolls: pollStats[0]?.totalPolls || 0,
        pollsByChain: pollsByChain || [],
      },
      distributions: {
        totalDistributions: distributionStats[0]?.totalDistributions || 0,
        totalAmount: distributionStats[0]?.totalAmount || '0',
        uniqueRecipients: distributionStats[0]?.uniqueRecipients || 0,
        byEventType: distributionsByType || [],
      },
      users: userStats[0] || {
        totalUsers: 0,
        totalRewards: '0',
        totalVotes: 0,
        activeUsers: 0,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Get poll-specific analytics
   */
  async getPollAnalytics(pollId: string) {
    const [poll, distributions, stats, byType] = await Promise.all([
      // Get poll details
      db.select().from(polls).where(eq(polls.id, pollId)).limit(1),

      // Get all distributions for this poll
      db
        .select()
        .from(distributionLogs)
        .where(eq(distributionLogs.pollId, pollId))
        .orderBy(desc(distributionLogs.timestamp)),

      // Get distribution statistics
      db
        .select({
          totalDistributed: sql<string>`COALESCE(SUM(${distributionLogs.amount}::numeric), 0)`,
          distributionCount: sql<number>`COUNT(*)`,
          uniqueRecipients: sql<number>`COUNT(DISTINCT ${distributionLogs.recipient})`,
          avgAmount: sql<string>`COALESCE(AVG(${distributionLogs.amount}::numeric), 0)`,
          maxAmount: sql<string>`COALESCE(MAX(${distributionLogs.amount}::numeric), 0)`,
          minAmount: sql<string>`COALESCE(MIN(${distributionLogs.amount}::numeric), 0)`,
        })
        .from(distributionLogs)
        .where(eq(distributionLogs.pollId, pollId)),

      // Get distribution counts by type (separate query)
      db
        .select({
          type: distributionLogs.eventType,
          count: sql<number>`COUNT(*)`,
        })
        .from(distributionLogs)
        .where(eq(distributionLogs.pollId, pollId))
        .groupBy(distributionLogs.eventType),
    ]);

    if (!poll || poll.length === 0) {
      return null;
    }

    return {
      poll: poll[0],
      distributions: {
        logs: distributions,
        stats: {
          totalDistributed: stats[0]?.totalDistributed || '0',
          distributionCount: stats[0]?.distributionCount || 0,
          uniqueRecipients: stats[0]?.uniqueRecipients || 0,
          byType: byType || [],
          avgAmount: stats[0]?.avgAmount || '0',
          maxAmount: stats[0]?.maxAmount || '0',
          minAmount: stats[0]?.minAmount || '0',
        },
      },
    };
  }

  /**
   * Get participation trends over time
   */
  async getParticipationTrends(chainId?: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const conditions = [gte(polls.createdAt, startDate)];
    if (chainId) {
      conditions.push(eq(polls.chainId, chainId));
    }

    const pollTrends = await db
      .select({
        date: sql<string>`DATE(${polls.createdAt})`,
        pollsCreated: sql<number>`COUNT(*)`,
      })
      .from(polls)
      .where(and(...conditions))
      .groupBy(sql`DATE(${polls.createdAt})`)
      .orderBy(sql`DATE(${polls.createdAt})`);

    // Get distribution trends
    const distributionTrends = await db
      .select({
        date: sql<string>`DATE(${distributionLogs.timestamp})`,
        distributionCount: sql<number>`COUNT(*)`,
        totalAmount: sql<string>`SUM(${distributionLogs.amount}::numeric)`,
      })
      .from(distributionLogs)
      .where(gte(distributionLogs.timestamp, startDate))
      .groupBy(sql`DATE(${distributionLogs.timestamp})`)
      .orderBy(sql`DATE(${distributionLogs.timestamp})`);

    return {
      period: {
        start: startDate,
        end: new Date(),
        days,
      },
      polls: pollTrends,
      distributions: distributionTrends,
    };
  }

  /**
   * Get reward distribution analytics
   */
  async getRewardAnalytics(chainId?: number) {
    let pollQuery = db.select().from(polls);

    if (chainId) {
      pollQuery = pollQuery.where(eq(polls.chainId, chainId)) as any;
    }

    const allPolls = await pollQuery;

    // Get distribution stats for each poll
    const pollDistributions = await Promise.all(
      allPolls.map(async (poll) => {
        const stats = await db
          .select({
            totalDistributed: sql<string>`SUM(${distributionLogs.amount}::numeric)`,
            recipientCount: sql<number>`COUNT(DISTINCT ${distributionLogs.recipient})`,
            distributionMode: sql<string>`${polls.distributionMode}`,
          })
          .from(distributionLogs)
          .leftJoin(polls, eq(distributionLogs.pollId, polls.id))
          .where(eq(distributionLogs.pollId, poll.id));

        return {
          pollId: poll.pollId,
          chainId: poll.chainId,
          distributionMode: poll.distributionMode,
          stats: stats[0] || {
            totalDistributed: '0',
            recipientCount: 0,
          },
        };
      })
    );

    // Aggregate by distribution mode
    const byMode = pollDistributions.reduce((acc, poll) => {
      const mode = poll.distributionMode;
      if (!acc[mode]) {
        acc[mode] = {
          count: 0,
          totalDistributed: '0',
          totalRecipients: 0,
        };
      }
      acc[mode].count++;
      acc[mode].totalDistributed = (
        BigInt(acc[mode].totalDistributed) +
        BigInt(poll.stats.totalDistributed || '0')
      ).toString();
      acc[mode].totalRecipients += poll.stats.recipientCount;
      return acc;
    }, {} as Record<string, any>);

    return {
      byPoll: pollDistributions,
      byMode,
      total: {
        polls: allPolls.length,
        totalDistributed: Object.values(byMode).reduce(
          (sum: bigint, mode: any) => sum + BigInt(mode.totalDistributed || '0'),
          0n
        ).toString(),
      },
    };
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagement() {
    const [engagement, topContributors] = await Promise.all([
      // Overall engagement metrics
      db
        .select({
          totalUsers: sql<number>`COUNT(*)`,
          activeVoters: sql<number>`COUNT(*) FILTER (WHERE ${leaderboard.totalVotes} > 0)`,
          activeCreators: sql<number>`COUNT(*) FILTER (WHERE ${leaderboard.pollsCreated} > 0)`,
          rewardRecipients: sql<number>`COUNT(*) FILTER (WHERE ${leaderboard.totalRewards}::numeric > 0)`,
          avgVotesPerUser: sql<string>`AVG(${leaderboard.totalVotes})`,
          avgRewardsPerUser: sql<string>`AVG(${leaderboard.totalRewards}::numeric)`,
        })
        .from(leaderboard),

      // Top contributors
      db
        .select()
        .from(leaderboard)
        .orderBy(
          desc(
            sql`(${leaderboard.totalVotes} + ${leaderboard.pollsCreated} * 10 + ${leaderboard.pollsParticipated} * 5)`
          )
        )
        .limit(10),
    ]);

    return {
      metrics: engagement[0] || {
        totalUsers: 0,
        activeVoters: 0,
        activeCreators: 0,
        rewardRecipients: 0,
        avgVotesPerUser: '0',
        avgRewardsPerUser: '0',
      },
      topContributors,
    };
  }

  /**
   * Compare multiple polls
   */
  async comparePolls(pollIds: string[]) {
    const comparisons = await Promise.all(
      pollIds.map(async (pollId) => {
        const [poll, stats] = await Promise.all([
          db.select().from(polls).where(eq(polls.id, pollId)).limit(1),
          db
            .select({
              totalDistributed: sql<string>`SUM(${distributionLogs.amount}::numeric)`,
              distributionCount: sql<number>`COUNT(*)`,
              uniqueRecipients: sql<number>`COUNT(DISTINCT ${distributionLogs.recipient})`,
            })
            .from(distributionLogs)
            .where(eq(distributionLogs.pollId, pollId)),
        ]);

        return {
          poll: poll[0] || null,
          stats: stats[0] || {
            totalDistributed: '0',
            distributionCount: 0,
            uniqueRecipients: 0,
          },
        };
      })
    );

    return {
      polls: comparisons,
      comparisonDate: new Date(),
    };
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
