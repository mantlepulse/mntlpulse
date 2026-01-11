/**
 * Staking Service for managing PULSE staking data
 */

import { db } from '../db/client';
import { stakes, stakingEvents, stakingStats, NewStake, NewStakingEvent } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

const MINIMUM_STAKE_FOR_PREMIUM = '10000000000000000000000'; // 10,000 PULSE

export class StakingService {
  /**
   * Create or update a stake record
   */
  async upsertStake(chainId: number, address: string, data: Partial<NewStake>) {
    const existing = await this.getByAddress(chainId, address);

    if (existing) {
      return this.update(existing.id, data);
    }

    const [stake] = await db
      .insert(stakes)
      .values({
        chainId,
        address: address.toLowerCase(),
        amount: data.amount || '0',
        stakingStartTime: data.stakingStartTime,
        lastRewardClaim: data.lastRewardClaim,
        totalRewardsClaimed: data.totalRewardsClaimed || '0',
        isActive: data.isActive ?? true,
        isPremium: this.checkIsPremium(data.amount || '0'),
      })
      .returning();

    return stake;
  }

  /**
   * Get stake by address
   */
  async getByAddress(chainId: number, address: string) {
    const [stake] = await db
      .select()
      .from(stakes)
      .where(
        and(
          eq(stakes.chainId, chainId),
          eq(stakes.address, address.toLowerCase())
        )
      )
      .limit(1);

    return stake || null;
  }

  /**
   * Get all active stakes
   */
  async getActiveStakes(chainId: number) {
    return db
      .select()
      .from(stakes)
      .where(
        and(
          eq(stakes.chainId, chainId),
          eq(stakes.isActive, true)
        )
      );
  }

  /**
   * Get all premium stakers
   */
  async getPremiumStakers(chainId: number) {
    return db
      .select()
      .from(stakes)
      .where(
        and(
          eq(stakes.chainId, chainId),
          eq(stakes.isPremium, true),
          eq(stakes.isActive, true)
        )
      );
  }

  /**
   * Update stake data
   */
  async update(id: string, data: Partial<NewStake>) {
    const updateData: Partial<NewStake> & { updatedAt: Date } = {
      ...data,
      updatedAt: new Date(),
    };

    // Update premium status if amount changed
    if (data.amount !== undefined) {
      updateData.isPremium = this.checkIsPremium(data.amount);
    }

    const [updated] = await db
      .update(stakes)
      .set(updateData)
      .where(eq(stakes.id, id))
      .returning();

    return updated;
  }

  /**
   * Check if an amount qualifies for premium
   */
  checkIsPremium(amount: string): boolean {
    try {
      return BigInt(amount) >= BigInt(MINIMUM_STAKE_FOR_PREMIUM);
    } catch {
      return false;
    }
  }

  /**
   * Check if address has premium via staking
   */
  async isPremiumByStaking(chainId: number, address: string): Promise<boolean> {
    const stake = await this.getByAddress(chainId, address);
    return stake?.isPremium ?? false;
  }

  /**
   * Log a staking event
   */
  async logEvent(data: NewStakingEvent) {
    const [event] = await db
      .insert(stakingEvents)
      .values({
        ...data,
        address: data.address.toLowerCase(),
      })
      .returning();

    return event;
  }

  /**
   * Get staking events for an address
   */
  async getEvents(chainId: number, address: string, limit = 50) {
    return db
      .select()
      .from(stakingEvents)
      .where(
        and(
          eq(stakingEvents.chainId, chainId),
          eq(stakingEvents.address, address.toLowerCase())
        )
      )
      .orderBy(desc(stakingEvents.timestamp))
      .limit(limit);
  }

  /**
   * Get or create staking stats
   */
  async getStats(chainId: number) {
    const [stats] = await db
      .select()
      .from(stakingStats)
      .where(eq(stakingStats.chainId, chainId))
      .limit(1);

    if (stats) return stats;

    // Create default stats if not exist
    const [newStats] = await db
      .insert(stakingStats)
      .values({
        chainId,
        totalStaked: '0',
        totalStakers: 0,
        totalPremiumStakers: 0,
        totalRewardsDistributed: '0',
        rewardRatePerSecond: '0',
        minimumStakeForPremium: MINIMUM_STAKE_FOR_PREMIUM,
      })
      .returning();

    return newStats;
  }

  /**
   * Update staking stats
   */
  async updateStats(chainId: number, data: Partial<{
    totalStaked: string;
    totalStakers: number;
    totalPremiumStakers: number;
    totalRewardsDistributed: string;
    rewardRatePerSecond: string;
  }>) {
    const [updated] = await db
      .update(stakingStats)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(stakingStats.chainId, chainId))
      .returning();

    return updated;
  }

  /**
   * Process stake event from blockchain
   */
  async processStakeEvent(
    chainId: number,
    address: string,
    amount: string,
    timestamp: Date,
    transactionHash?: string,
    blockNumber?: string
  ) {
    // Update or create stake
    const stake = await this.getByAddress(chainId, address);
    const newAmount = stake
      ? (BigInt(stake.amount) + BigInt(amount)).toString()
      : amount;

    await this.upsertStake(chainId, address, {
      amount: newAmount,
      stakingStartTime: stake?.stakingStartTime || timestamp,
      isActive: true,
    });

    // Log event
    await this.logEvent({
      chainId,
      address,
      eventType: 'STAKE',
      amount,
      transactionHash,
      blockNumber,
      timestamp,
    });
  }

  /**
   * Process unstake event from blockchain
   */
  async processUnstakeEvent(
    chainId: number,
    address: string,
    amount: string,
    timestamp: Date,
    transactionHash?: string,
    blockNumber?: string
  ) {
    const stake = await this.getByAddress(chainId, address);
    if (!stake) return;

    const newAmount = (BigInt(stake.amount) - BigInt(amount)).toString();
    const isActive = BigInt(newAmount) > BigInt(0);

    await this.update(stake.id, {
      amount: newAmount,
      isActive,
    });

    // Log event
    await this.logEvent({
      chainId,
      address,
      eventType: 'UNSTAKE',
      amount,
      transactionHash,
      blockNumber,
      timestamp,
    });
  }

  /**
   * Process reward claim event from blockchain
   */
  async processClaimEvent(
    chainId: number,
    address: string,
    amount: string,
    timestamp: Date,
    transactionHash?: string,
    blockNumber?: string
  ) {
    const stake = await this.getByAddress(chainId, address);
    if (!stake) return;

    const totalClaimed = (BigInt(stake.totalRewardsClaimed || '0') + BigInt(amount)).toString();

    await this.update(stake.id, {
      lastRewardClaim: timestamp,
      totalRewardsClaimed: totalClaimed,
    });

    // Log event
    await this.logEvent({
      chainId,
      address,
      eventType: 'CLAIM_REWARDS',
      amount,
      transactionHash,
      blockNumber,
      timestamp,
    });
  }
}

// Export singleton instance
export const stakingService = new StakingService();
