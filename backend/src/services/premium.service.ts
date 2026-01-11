/**
 * Premium Service for managing subscription data
 */

import { db } from '../db/client';
import { subscriptions, subscriptionEvents, subscriptionStats, NewSubscription, NewSubscriptionEvent } from '../db/schema';
import { eq, and, desc, gt } from 'drizzle-orm';
import { stakingService } from './staking.service';

export type SubscriptionTier = 'MONTHLY' | 'ANNUAL' | 'LIFETIME';

// Subscription durations in milliseconds
const TIER_DURATIONS: Record<SubscriptionTier, number | null> = {
  MONTHLY: 30 * 24 * 60 * 60 * 1000, // 30 days
  ANNUAL: 365 * 24 * 60 * 60 * 1000, // 365 days
  LIFETIME: null, // Never expires
};

export class PremiumService {
  /**
   * Create or update a subscription
   */
  async upsertSubscription(chainId: number, address: string, data: Partial<NewSubscription>) {
    const existing = await this.getByAddress(chainId, address);

    if (existing) {
      return this.update(existing.id, data);
    }

    const [subscription] = await db
      .insert(subscriptions)
      .values({
        chainId,
        address: address.toLowerCase(),
        tier: data.tier || 'MONTHLY',
        expirationTime: data.expirationTime,
        purchaseTime: data.purchaseTime || new Date(),
        purchasePrice: data.purchasePrice || '0',
        transactionHash: data.transactionHash,
        isActive: data.isActive ?? true,
      })
      .returning();

    return subscription;
  }

  /**
   * Get subscription by address
   */
  async getByAddress(chainId: number, address: string) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.chainId, chainId),
          eq(subscriptions.address, address.toLowerCase())
        )
      )
      .limit(1);

    return subscription || null;
  }

  /**
   * Get all active subscriptions
   */
  async getActiveSubscriptions(chainId: number) {
    return db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.chainId, chainId),
          eq(subscriptions.isActive, true)
        )
      );
  }

  /**
   * Update subscription data
   */
  async update(id: string, data: Partial<NewSubscription>) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, id))
      .returning();

    return updated;
  }

  /**
   * Check if address has active subscription
   */
  async hasActiveSubscription(chainId: number, address: string): Promise<boolean> {
    const subscription = await this.getByAddress(chainId, address);

    if (!subscription || !subscription.isActive) {
      return false;
    }

    // Lifetime never expires
    if (subscription.tier === 'LIFETIME') {
      return true;
    }

    // Check if expiration time hasn't passed
    if (subscription.expirationTime) {
      return new Date() < subscription.expirationTime;
    }

    return false;
  }

  /**
   * Check if address has premium (via subscription OR staking)
   */
  async isPremiumOrStaked(chainId: number, address: string): Promise<boolean> {
    // Check subscription first
    const hasSubscription = await this.hasActiveSubscription(chainId, address);
    if (hasSubscription) return true;

    // Check staking
    return stakingService.isPremiumByStaking(chainId, address);
  }

  /**
   * Get premium status details
   */
  async getPremiumStatus(chainId: number, address: string) {
    const subscription = await this.getByAddress(chainId, address);
    const stake = await stakingService.getByAddress(chainId, address);

    const hasSubscription = await this.hasActiveSubscription(chainId, address);
    const hasPremiumStake = stake?.isPremium ?? false;

    let subscriptionTimeRemaining: number | null = null;
    if (subscription?.isActive && subscription.expirationTime) {
      subscriptionTimeRemaining = Math.max(
        0,
        subscription.expirationTime.getTime() - Date.now()
      );
    } else if (subscription?.tier === 'LIFETIME') {
      subscriptionTimeRemaining = -1; // -1 indicates lifetime
    }

    return {
      isPremium: hasSubscription || hasPremiumStake,
      hasSubscription,
      hasPremiumStake,
      subscription: subscription
        ? {
            tier: subscription.tier,
            expirationTime: subscription.expirationTime,
            isActive: subscription.isActive,
            timeRemaining: subscriptionTimeRemaining,
          }
        : null,
      stake: stake
        ? {
            amount: stake.amount,
            isPremium: stake.isPremium,
            stakingStartTime: stake.stakingStartTime,
          }
        : null,
    };
  }

  /**
   * Log a subscription event
   */
  async logEvent(data: NewSubscriptionEvent) {
    const [event] = await db
      .insert(subscriptionEvents)
      .values({
        ...data,
        address: data.address.toLowerCase(),
      })
      .returning();

    return event;
  }

  /**
   * Get subscription events for an address
   */
  async getEvents(chainId: number, address: string, limit = 50) {
    return db
      .select()
      .from(subscriptionEvents)
      .where(
        and(
          eq(subscriptionEvents.chainId, chainId),
          eq(subscriptionEvents.address, address.toLowerCase())
        )
      )
      .orderBy(desc(subscriptionEvents.timestamp))
      .limit(limit);
  }

  /**
   * Get or create subscription stats
   */
  async getStats(chainId: number) {
    const [stats] = await db
      .select()
      .from(subscriptionStats)
      .where(eq(subscriptionStats.chainId, chainId))
      .limit(1);

    if (stats) return stats;

    // Create default stats if not exist
    const [newStats] = await db
      .insert(subscriptionStats)
      .values({
        chainId,
        totalSubscribers: 0,
        monthlySubscribers: 0,
        annualSubscribers: 0,
        lifetimeSubscribers: 0,
        totalRevenue: '0',
      })
      .returning();

    return newStats;
  }

  /**
   * Update subscription stats
   */
  async updateStats(chainId: number, data: Partial<{
    totalSubscribers: number;
    monthlySubscribers: number;
    annualSubscribers: number;
    lifetimeSubscribers: number;
    totalRevenue: string;
  }>) {
    const [updated] = await db
      .update(subscriptionStats)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionStats.chainId, chainId))
      .returning();

    return updated;
  }

  /**
   * Process subscription purchase from blockchain
   */
  async processSubscriptionPurchase(
    chainId: number,
    address: string,
    tier: SubscriptionTier,
    price: string,
    timestamp: Date,
    transactionHash?: string,
    blockNumber?: string
  ) {
    const existing = await this.getByAddress(chainId, address);

    // Calculate expiration time
    let expirationTime: Date | null = null;
    const duration = TIER_DURATIONS[tier];

    if (duration !== null) {
      const baseTime = existing?.expirationTime && existing.expirationTime > new Date()
        ? existing.expirationTime
        : timestamp;
      expirationTime = new Date(baseTime.getTime() + duration);
    }

    // Create or update subscription
    await this.upsertSubscription(chainId, address, {
      tier,
      purchaseTime: timestamp,
      purchasePrice: price,
      expirationTime,
      transactionHash,
      isActive: true,
    });

    // Log event
    await this.logEvent({
      chainId,
      address,
      eventType: existing ? 'EXTEND' : 'PURCHASE',
      tier,
      price,
      transactionHash,
      blockNumber,
      timestamp,
    });

    // Update stats
    const stats = await this.getStats(chainId);
    const tierKey = `${tier.toLowerCase()}Subscribers` as keyof typeof stats;
    await this.updateStats(chainId, {
      totalSubscribers: (stats.totalSubscribers || 0) + (existing ? 0 : 1),
      [tierKey]: ((stats as Record<string, unknown>)[tierKey] as number || 0) + (existing ? 0 : 1),
      totalRevenue: (BigInt(stats.totalRevenue || '0') + BigInt(price)).toString(),
    });
  }

  /**
   * Check and mark expired subscriptions
   */
  async checkExpiredSubscriptions(chainId: number) {
    const now = new Date();

    // Find expired subscriptions
    const expired = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.chainId, chainId),
          eq(subscriptions.isActive, true),
          gt(subscriptions.expirationTime, now)
        )
      );

    // Note: This is inverted - we want ones where expirationTime < now
    // But drizzle doesn't have lt, so we'll handle it differently
    const allActive = await this.getActiveSubscriptions(chainId);
    const toExpire = allActive.filter(
      (s) => s.tier !== 'LIFETIME' && s.expirationTime && s.expirationTime < now
    );

    for (const subscription of toExpire) {
      await this.update(subscription.id, { isActive: false });

      await this.logEvent({
        chainId,
        address: subscription.address,
        eventType: 'EXPIRE',
        tier: subscription.tier,
        price: '0',
        timestamp: now,
      });
    }

    return toExpire.length;
  }
}

// Export singleton instance
export const premiumService = new PremiumService();
