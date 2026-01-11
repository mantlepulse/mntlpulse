/**
 * Membership Service
 * Manages user tiers, daily vote limits, and tier progression
 */

import { db } from '../db/client';
import {
  membershipTiers,
  userMembership,
  dailyVoteCounts,
  TierRequirements,
} from '../db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';

export class MembershipService {
  /**
   * Get all membership tier definitions
   */
  async getAllTiers() {
    return db
      .select()
      .from(membershipTiers)
      .orderBy(asc(membershipTiers.displayOrder));
  }

  /**
   * Get a specific tier by slug
   */
  async getTierBySlug(slug: string) {
    const [tier] = await db
      .select()
      .from(membershipTiers)
      .where(eq(membershipTiers.slug, slug))
      .limit(1);
    return tier;
  }

  /**
   * Get user's current membership status
   */
  async getUserMembership(address: string) {
    const normalizedAddress = address.toLowerCase();

    const [membership] = await db
      .select()
      .from(userMembership)
      .where(eq(userMembership.address, normalizedAddress))
      .limit(1);

    if (!membership) {
      // Create default bronze membership
      const [newMembership] = await db
        .insert(userMembership)
        .values({
          address: normalizedAddress,
          currentTier: 'bronze',
        })
        .returning();
      return newMembership;
    }

    return membership;
  }

  /**
   * Get user's membership with tier details
   */
  async getUserMembershipWithTier(address: string) {
    const membership = await this.getUserMembership(address);
    const tier = await this.getTierBySlug(membership.currentTier);
    return { membership, tier };
  }

  /**
   * Check and update user's tier based on their stats
   */
  async checkAndUpdateTier(address: string) {
    const normalizedAddress = address.toLowerCase();
    const membership = await this.getUserMembership(normalizedAddress);
    const allTiers = await this.getAllTiers();

    // Find the highest tier the user qualifies for
    let qualifiedTier = 'bronze';
    for (const tier of allTiers) {
      const requirements = tier.requirements as TierRequirements;
      if (
        membership.pollsParticipated >= requirements.pollsParticipated &&
        membership.totalVotesCast >= requirements.totalVotes &&
        membership.pollsCreated >= requirements.pollsCreated &&
        membership.seasonsCompleted >= requirements.seasonsCompleted
      ) {
        qualifiedTier = tier.slug;
      }
    }

    // Update if tier changed
    if (qualifiedTier !== membership.currentTier) {
      const [updated] = await db
        .update(userMembership)
        .set({
          currentTier: qualifiedTier,
          tierUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userMembership.address, normalizedAddress))
        .returning();
      return updated;
    }

    return membership;
  }

  /**
   * Update user's cached stats (called when user votes, creates polls, etc.)
   */
  async updateUserStats(
    address: string,
    updates: {
      pollsParticipated?: number;
      totalVotesCast?: number;
      pollsCreated?: number;
      seasonsCompleted?: number;
    }
  ) {
    const normalizedAddress = address.toLowerCase();
    await this.getUserMembership(normalizedAddress); // Ensure membership exists

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (updates.pollsParticipated !== undefined) {
      updateData.pollsParticipated = sql`${userMembership.pollsParticipated} + ${updates.pollsParticipated}`;
    }
    if (updates.totalVotesCast !== undefined) {
      updateData.totalVotesCast = sql`${userMembership.totalVotesCast} + ${updates.totalVotesCast}`;
    }
    if (updates.pollsCreated !== undefined) {
      updateData.pollsCreated = sql`${userMembership.pollsCreated} + ${updates.pollsCreated}`;
    }
    if (updates.seasonsCompleted !== undefined) {
      updateData.seasonsCompleted = sql`${userMembership.seasonsCompleted} + ${updates.seasonsCompleted}`;
    }

    const [updated] = await db
      .update(userMembership)
      .set(updateData)
      .where(eq(userMembership.address, normalizedAddress))
      .returning();

    // Check if tier should be updated
    return this.checkAndUpdateTier(normalizedAddress);
  }

  /**
   * Get user's daily vote count for today
   */
  async getDailyVoteCount(address: string) {
    const normalizedAddress = address.toLowerCase();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const [record] = await db
      .select()
      .from(dailyVoteCounts)
      .where(
        and(
          eq(dailyVoteCounts.address, normalizedAddress),
          eq(dailyVoteCounts.date, today)
        )
      )
      .limit(1);

    return record?.voteCount || 0;
  }

  /**
   * Check if user can vote today (based on tier limit)
   */
  async canUserVote(address: string): Promise<{ canVote: boolean; remaining: number; limit: number }> {
    const { membership, tier } = await this.getUserMembershipWithTier(address);
    const todayVotes = await this.getDailyVoteCount(address);
    const limit = tier?.dailyVoteLimit || 3; // Default to bronze limit

    return {
      canVote: todayVotes < limit,
      remaining: Math.max(0, limit - todayVotes),
      limit,
    };
  }

  /**
   * Increment daily vote count (call when user votes)
   */
  async incrementDailyVoteCount(address: string) {
    const normalizedAddress = address.toLowerCase();
    const today = new Date().toISOString().split('T')[0];

    // Upsert daily vote count
    await db
      .insert(dailyVoteCounts)
      .values({
        address: normalizedAddress,
        date: today,
        voteCount: 1,
      })
      .onConflictDoUpdate({
        target: [dailyVoteCounts.address, dailyVoteCounts.date],
        set: {
          voteCount: sql`${dailyVoteCounts.voteCount} + 1`,
          updatedAt: new Date(),
        },
      });

    // Also update total votes in membership
    await this.updateUserStats(normalizedAddress, { totalVotesCast: 1 });
  }

  /**
   * Get vote limit info for user
   */
  async getVoteLimitInfo(address: string) {
    const { membership, tier } = await this.getUserMembershipWithTier(address);
    const todayVotes = await this.getDailyVoteCount(address);
    const limit = tier?.dailyVoteLimit || 3;

    return {
      tier: membership.currentTier,
      tierName: tier?.name || 'Bronze',
      todayVotes,
      dailyLimit: limit,
      remaining: Math.max(0, limit - todayVotes),
      canVote: todayVotes < limit,
    };
  }
}

export const membershipService = new MembershipService();
