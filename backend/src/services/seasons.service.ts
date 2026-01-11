/**
 * Seasons Service
 * Manages seasons/tournaments created by creators for point accumulation
 */

import { db } from '../db/client';
import { seasons, userSeasonPoints, SeasonStatus } from '../db/schema';
import { eq, and, desc, asc, gte, lte, sql, or } from 'drizzle-orm';

export interface CreateSeasonInput {
  creatorAddress: string;
  name: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  totalPulsePool?: string;
  isPublic?: boolean;
}

export interface UpdateSeasonInput {
  name?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  totalPulsePool?: string;
  isPublic?: boolean;
  status?: SeasonStatus;
}

export class SeasonsService {
  /**
   * Create a new season
   */
  async createSeason(input: CreateSeasonInput) {
    const [season] = await db
      .insert(seasons)
      .values({
        creatorAddress: input.creatorAddress.toLowerCase(),
        name: input.name,
        description: input.description,
        startTime: input.startTime,
        endTime: input.endTime,
        totalPulsePool: input.totalPulsePool || '0',
        isPublic: input.isPublic ?? true,
        status: input.startTime <= new Date() ? 'active' : 'upcoming',
      })
      .returning();
    return season;
  }

  /**
   * Get all seasons with optional filters
   */
  async getAllSeasons(options?: { status?: SeasonStatus; creatorAddress?: string; isPublic?: boolean }) {
    const conditions = [];

    if (options?.status) {
      conditions.push(eq(seasons.status, options.status));
    }
    if (options?.creatorAddress) {
      conditions.push(eq(seasons.creatorAddress, options.creatorAddress.toLowerCase()));
    }
    if (options?.isPublic !== undefined) {
      conditions.push(eq(seasons.isPublic, options.isPublic));
    }

    return db
      .select()
      .from(seasons)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(seasons.startTime));
  }

  /**
   * Get season by ID
   */
  async getSeasonById(id: string) {
    const [season] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.id, id))
      .limit(1);
    return season;
  }

  /**
   * Get current active seasons
   */
  async getActiveSeasons() {
    const now = new Date();
    return db
      .select()
      .from(seasons)
      .where(
        and(
          eq(seasons.status, 'active'),
          lte(seasons.startTime, now),
          gte(seasons.endTime, now)
        )
      )
      .orderBy(asc(seasons.endTime));
  }

  /**
   * Get seasons by creator
   */
  async getSeasonsByCreator(creatorAddress: string) {
    return db
      .select()
      .from(seasons)
      .where(eq(seasons.creatorAddress, creatorAddress.toLowerCase()))
      .orderBy(desc(seasons.createdAt));
  }

  /**
   * Update a season
   */
  async updateSeason(id: string, creatorAddress: string, updates: UpdateSeasonInput) {
    const [updated] = await db
      .update(seasons)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(seasons.id, id),
          eq(seasons.creatorAddress, creatorAddress.toLowerCase())
        )
      )
      .returning();
    return updated;
  }

  /**
   * Update season status (automatic status transitions)
   */
  async updateSeasonStatuses() {
    const now = new Date();

    // Activate upcoming seasons that have started
    await db
      .update(seasons)
      .set({ status: 'active', updatedAt: now })
      .where(
        and(
          eq(seasons.status, 'upcoming'),
          lte(seasons.startTime, now)
        )
      );

    // End active seasons that have passed their end time
    await db
      .update(seasons)
      .set({ status: 'ended', updatedAt: now })
      .where(
        and(
          eq(seasons.status, 'active'),
          lte(seasons.endTime, now)
        )
      );
  }

  /**
   * Get season leaderboard (top users by points)
   */
  async getSeasonLeaderboard(seasonId: string, limit = 100) {
    return db
      .select({
        address: userSeasonPoints.address,
        totalPoints: userSeasonPoints.totalPoints,
        pulseEarned: userSeasonPoints.pulseEarned,
        pulseClaimed: userSeasonPoints.pulseClaimed,
      })
      .from(userSeasonPoints)
      .where(eq(userSeasonPoints.seasonId, seasonId))
      .orderBy(desc(userSeasonPoints.totalPoints))
      .limit(limit);
  }

  /**
   * Calculate and set pulsePerPoint at season end
   */
  async calculatePulseDistribution(seasonId: string) {
    const season = await this.getSeasonById(seasonId);
    if (!season || season.status !== 'ended') {
      throw new Error('Season not found or not ended');
    }

    // Get total points in this season
    const [result] = await db
      .select({
        totalPoints: sql<number>`COALESCE(SUM(${userSeasonPoints.totalPoints}), 0)`,
      })
      .from(userSeasonPoints)
      .where(eq(userSeasonPoints.seasonId, seasonId));

    const totalPoints = result?.totalPoints || 0;
    if (totalPoints === 0) {
      return { pulsePerPoint: '0', totalPoints: 0 };
    }

    // Calculate PULSE per point (using BigInt math)
    const totalPool = BigInt(season.totalPulsePool);
    const pulsePerPoint = totalPool / BigInt(totalPoints);

    // Update season with calculated value
    await db
      .update(seasons)
      .set({
        pulsePerPoint: pulsePerPoint.toString(),
        updatedAt: new Date(),
      })
      .where(eq(seasons.id, seasonId));

    // Update each user's pulseEarned
    await db
      .update(userSeasonPoints)
      .set({
        pulseEarned: sql`(${userSeasonPoints.totalPoints} * ${pulsePerPoint.toString()})::text`,
        updatedAt: new Date(),
      })
      .where(eq(userSeasonPoints.seasonId, seasonId));

    return {
      pulsePerPoint: pulsePerPoint.toString(),
      totalPoints,
      totalPool: season.totalPulsePool,
    };
  }

  /**
   * Mark season as distributed
   */
  async markSeasonDistributed(seasonId: string) {
    const [updated] = await db
      .update(seasons)
      .set({
        status: 'distributed',
        updatedAt: new Date(),
      })
      .where(eq(seasons.id, seasonId))
      .returning();
    return updated;
  }

  /**
   * Delete a season (only if upcoming and no participants)
   */
  async deleteSeason(id: string, creatorAddress: string) {
    const season = await this.getSeasonById(id);
    if (!season) {
      throw new Error('Season not found');
    }
    if (season.creatorAddress !== creatorAddress.toLowerCase()) {
      throw new Error('Not authorized');
    }
    if (season.status !== 'upcoming') {
      throw new Error('Can only delete upcoming seasons');
    }

    // Check for participants
    const [participant] = await db
      .select()
      .from(userSeasonPoints)
      .where(eq(userSeasonPoints.seasonId, id))
      .limit(1);

    if (participant) {
      throw new Error('Cannot delete season with participants');
    }

    await db.delete(seasons).where(eq(seasons.id, id));
    return true;
  }
}

export const seasonsService = new SeasonsService();
