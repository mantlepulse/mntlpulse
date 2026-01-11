/**
 * Points Service
 * Manages user points, transactions, and season participation
 */

import { db } from '../db/client';
import {
  userSeasonPoints,
  pointsTransactions,
  PointsTransactionType,
  membershipTiers,
  userMembership,
} from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { membershipService } from './membership.service';

export interface AwardPointsInput {
  address: string;
  seasonId: string;
  amount: number;
  type: PointsTransactionType;
  questId?: string;
  description?: string;
}

export class PointsService {
  /**
   * Get user's points for a specific season
   */
  async getUserSeasonPoints(address: string, seasonId: string) {
    const normalizedAddress = address.toLowerCase();

    const [points] = await db
      .select()
      .from(userSeasonPoints)
      .where(
        and(
          eq(userSeasonPoints.address, normalizedAddress),
          eq(userSeasonPoints.seasonId, seasonId)
        )
      )
      .limit(1);

    return points;
  }

  /**
   * Get or create user's season points record
   */
  async getOrCreateUserSeasonPoints(address: string, seasonId: string) {
    const normalizedAddress = address.toLowerCase();
    let points = await this.getUserSeasonPoints(normalizedAddress, seasonId);

    if (!points) {
      const [created] = await db
        .insert(userSeasonPoints)
        .values({
          address: normalizedAddress,
          seasonId,
          totalPoints: 0,
        })
        .returning();
      points = created;
    }

    return points;
  }

  /**
   * Award points to a user
   * Respects tier-based max season points
   */
  async awardPoints(input: AwardPointsInput): Promise<{ success: boolean; pointsAwarded: number; reason?: string }> {
    const normalizedAddress = input.address.toLowerCase();

    // Get user's tier to check max points
    const { membership, tier } = await membershipService.getUserMembershipWithTier(normalizedAddress);
    const maxSeasonPoints = tier?.maxSeasonPoints || 1000; // Default max for bronze

    // Get or create season points record
    const seasonPoints = await this.getOrCreateUserSeasonPoints(normalizedAddress, input.seasonId);

    // Check if awarding would exceed max
    const potentialTotal = seasonPoints.totalPoints + input.amount;
    let actualAmount = input.amount;

    if (potentialTotal > maxSeasonPoints) {
      actualAmount = Math.max(0, maxSeasonPoints - seasonPoints.totalPoints);
      if (actualAmount === 0) {
        return {
          success: false,
          pointsAwarded: 0,
          reason: `Max season points (${maxSeasonPoints}) reached for ${membership.currentTier} tier`,
        };
      }
    }

    // Create transaction record
    await db.insert(pointsTransactions).values({
      address: normalizedAddress,
      seasonId: input.seasonId,
      amount: actualAmount,
      type: input.type,
      questId: input.questId,
      description: input.description,
    });

    // Update total points
    const [updated] = await db
      .update(userSeasonPoints)
      .set({
        totalPoints: sql`${userSeasonPoints.totalPoints} + ${actualAmount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userSeasonPoints.address, normalizedAddress),
          eq(userSeasonPoints.seasonId, input.seasonId)
        )
      )
      .returning();

    return {
      success: true,
      pointsAwarded: actualAmount,
      reason: actualAmount < input.amount ? `Capped at tier max (${maxSeasonPoints})` : undefined,
    };
  }

  /**
   * Get user's points transaction history
   */
  async getPointsHistory(address: string, seasonId?: string, limit = 50) {
    const normalizedAddress = address.toLowerCase();

    const conditions = [eq(pointsTransactions.address, normalizedAddress)];
    if (seasonId) {
      conditions.push(eq(pointsTransactions.seasonId, seasonId));
    }

    return db
      .select()
      .from(pointsTransactions)
      .where(and(...conditions))
      .orderBy(desc(pointsTransactions.createdAt))
      .limit(limit);
  }

  /**
   * Get user's total points across all seasons
   */
  async getTotalPointsAllSeasons(address: string) {
    const normalizedAddress = address.toLowerCase();

    const [result] = await db
      .select({
        totalPoints: sql<number>`COALESCE(SUM(${userSeasonPoints.totalPoints}), 0)`,
        seasonCount: sql<number>`COUNT(*)`,
      })
      .from(userSeasonPoints)
      .where(eq(userSeasonPoints.address, normalizedAddress));

    return {
      totalPoints: result?.totalPoints || 0,
      seasonCount: result?.seasonCount || 0,
    };
  }

  /**
   * Reverse a points transaction (for abuse handling)
   */
  async reverseTransaction(transactionId: string, adminAddress: string, reason: string) {
    const [transaction] = await db
      .select()
      .from(pointsTransactions)
      .where(eq(pointsTransactions.id, transactionId))
      .limit(1);

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.reversedAt) {
      throw new Error('Transaction already reversed');
    }

    // Mark transaction as reversed
    await db
      .update(pointsTransactions)
      .set({
        reversedAt: new Date(),
        reversedBy: adminAddress.toLowerCase(),
        reversalReason: reason,
      })
      .where(eq(pointsTransactions.id, transactionId));

    // Subtract points from user's total
    await db
      .update(userSeasonPoints)
      .set({
        totalPoints: sql`GREATEST(0, ${userSeasonPoints.totalPoints} - ${transaction.amount})`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userSeasonPoints.address, transaction.address),
          eq(userSeasonPoints.seasonId, transaction.seasonId)
        )
      );

    // Create reversal transaction record
    await db.insert(pointsTransactions).values({
      address: transaction.address,
      seasonId: transaction.seasonId,
      amount: -transaction.amount,
      type: 'adjustment',
      description: `Reversal: ${reason}`,
    });

    return true;
  }

  /**
   * Mark user's PULSE as claimed for a season
   */
  async markPulseClaimed(address: string, seasonId: string, txHash: string) {
    const normalizedAddress = address.toLowerCase();

    const [updated] = await db
      .update(userSeasonPoints)
      .set({
        pulseClaimed: true,
        claimTxHash: txHash,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userSeasonPoints.address, normalizedAddress),
          eq(userSeasonPoints.seasonId, seasonId)
        )
      )
      .returning();

    return updated;
  }

  /**
   * Get unclaimed PULSE rewards for a user
   */
  async getUnclaimedRewards(address: string) {
    const normalizedAddress = address.toLowerCase();

    return db
      .select()
      .from(userSeasonPoints)
      .where(
        and(
          eq(userSeasonPoints.address, normalizedAddress),
          eq(userSeasonPoints.pulseClaimed, false),
          sql`${userSeasonPoints.pulseEarned} != '0'`
        )
      );
  }
}

export const pointsService = new PointsService();
