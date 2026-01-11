/**
 * Subgraph Sync Service
 * Syncs data from The Graph subgraph to local database on server startup
 */

import { GraphQLClient } from 'graphql-request';
import { db } from '../db/client';
import { polls, leaderboard } from '../db/schema';
import { SUBGRAPH_URLS, GLOBAL_STATS_ID } from '../config/subgraph';
import { CHAIN_ID } from '../config/contracts';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import {
  GET_ALL_POLLS,
  GET_ALL_USERS,
  GET_GLOBAL_STATS,
  PollsResponse,
  UsersResponse,
  GlobalStatsResponse,
} from '../graphql/queries';

export class SubgraphSyncService {
  private client: GraphQLClient | null = null;

  constructor() {
    const subgraphUrl = SUBGRAPH_URLS[CHAIN_ID];
    if (subgraphUrl) {
      this.client = new GraphQLClient(subgraphUrl);
      logger.info(`Subgraph sync service initialized for chain ${CHAIN_ID}`);
    } else {
      logger.warn(`No subgraph URL configured for chain ${CHAIN_ID}, sync will be skipped`);
    }
  }

  /**
   * Run sync on server startup
   * This is non-blocking and failures don't prevent server from starting
   */
  async syncOnStartup(): Promise<void> {
    if (!this.client) {
      logger.warn('Subgraph client not available, skipping sync');
      return;
    }

    logger.info('Starting subgraph sync...');

    try {
      // Log global stats first
      await this.logGlobalStats();

      // Sync polls and leaderboard
      await this.syncPolls();
      await this.syncLeaderboard();

      logger.info('Subgraph sync completed successfully');
    } catch (error) {
      logger.error('Subgraph sync failed', { error });
      // Don't throw - allow server to start even if sync fails
    }
  }

  /**
   * Log global stats from subgraph (for debugging)
   */
  private async logGlobalStats(): Promise<void> {
    if (!this.client) return;

    try {
      const data = await this.client.request<GlobalStatsResponse>(GET_GLOBAL_STATS, {
        id: GLOBAL_STATS_ID,
      });

      if (data.globalStats) {
        logger.info('Subgraph global stats', {
          totalPolls: data.globalStats.totalPolls,
          totalVotes: data.globalStats.totalVotes,
          totalUsers: data.globalStats.totalUsers,
          totalDistributions: data.globalStats.totalDistributions,
        });
      } else {
        logger.info('No global stats found in subgraph');
      }
    } catch (error) {
      logger.warn('Failed to fetch global stats from subgraph', { error });
    }
  }

  /**
   * Sync all polls from subgraph to local database
   */
  private async syncPolls(): Promise<void> {
    if (!this.client) return;

    let skip = 0;
    const first = 100;
    let hasMore = true;
    let totalSynced = 0;

    while (hasMore) {
      try {
        const data = await this.client.request<PollsResponse>(GET_ALL_POLLS, { first, skip });

        if (!data.polls || data.polls.length === 0) {
          hasMore = false;
          break;
        }

        for (const poll of data.polls) {
          try {
            // Map subgraph distribution mode to database format
            const distributionMode = this.mapDistributionMode(poll.distributionMode);

            await db
              .insert(polls)
              .values({
                chainId: CHAIN_ID,
                pollId: BigInt(poll.pollId),
                distributionMode,
              })
              .onConflictDoNothing();

            totalSynced++;
          } catch (insertError) {
            logger.warn(`Failed to sync poll ${poll.pollId}`, { error: insertError });
          }
        }

        skip += first;
        if (data.polls.length < first) hasMore = false;
      } catch (queryError) {
        logger.error('Failed to query polls from subgraph', { error: queryError });
        hasMore = false;
      }
    }

    logger.info(`Synced ${totalSynced} polls from subgraph`);
  }

  /**
   * Sync all users from subgraph to leaderboard
   */
  private async syncLeaderboard(): Promise<void> {
    if (!this.client) return;

    let skip = 0;
    const first = 100;
    let hasMore = true;
    let totalSynced = 0;

    while (hasMore) {
      try {
        const data = await this.client.request<UsersResponse>(GET_ALL_USERS, { first, skip });

        if (!data.users || data.users.length === 0) {
          hasMore = false;
          break;
        }

        for (const user of data.users) {
          try {
            const address = user.id.toLowerCase();

            // Check if user already exists
            const existing = await db
              .select()
              .from(leaderboard)
              .where(eq(leaderboard.address, address))
              .limit(1);

            if (existing.length === 0) {
              // Insert new user
              await db.insert(leaderboard).values({
                address,
                totalRewards: user.totalRewards || '0',
                pollsParticipated: parseInt(user.pollsParticipated) || 0,
                totalVotes: parseInt(user.totalVotes) || 0,
                pollsCreated: parseInt(user.pollsCreatedCount) || 0,
                lastUpdated: new Date(),
              });
            } else {
              // Update existing user with subgraph data (subgraph is source of truth)
              await db
                .update(leaderboard)
                .set({
                  totalRewards: user.totalRewards || existing[0].totalRewards,
                  pollsParticipated: parseInt(user.pollsParticipated) || existing[0].pollsParticipated,
                  totalVotes: parseInt(user.totalVotes) || existing[0].totalVotes,
                  pollsCreated: parseInt(user.pollsCreatedCount) || existing[0].pollsCreated,
                  lastUpdated: new Date(),
                })
                .where(eq(leaderboard.address, address));
            }

            totalSynced++;
          } catch (upsertError) {
            logger.warn(`Failed to sync user ${user.id}`, { error: upsertError });
          }
        }

        skip += first;
        if (data.users.length < first) hasMore = false;
      } catch (queryError) {
        logger.error('Failed to query users from subgraph', { error: queryError });
        hasMore = false;
      }
    }

    logger.info(`Synced ${totalSynced} users to leaderboard from subgraph`);
  }

  /**
   * Map subgraph distribution mode to database format
   */
  private mapDistributionMode(mode: string): string {
    const modeMap: Record<string, string> = {
      MANUAL_PULL: 'MANUAL_PULL',
      MANUAL_PUSH: 'MANUAL_PUSH',
      AUTOMATED: 'AUTOMATED',
    };
    return modeMap[mode] || 'MANUAL_PULL';
  }
}

// Export singleton instance
export const subgraphSyncService = new SubgraphSyncService();
