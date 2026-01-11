/**
 * ZK Verification Service
 * Multi-provider service for managing identity verifications
 * Supports:
 * - ZK Providers: Reclaim Protocol, Polygon ID, zkPass, World ID
 * - OAuth: Twitter, Discord, GitHub, Telegram
 * Stores only nullifiers/hashed IDs - NO personal data
 */

import { db } from '../db/client';
import {
  zkVerifications,
  zkVerificationEvents,
  zkVerificationStats,
  zkProviderConfig,
  SocialType,
  ZKProvider,
  VerificationType,
  ZK_PROVIDER_NAMES,
  VERIFICATION_TYPE_NAMES,
  NewZKVerification,
  NewZKVerificationEvent,
} from '../db/schema';
import { eq, and, desc, sql, isNull, or } from 'drizzle-orm';
import { premiumService } from './premium.service';

export { SocialType, ZKProvider, VerificationType, ZK_PROVIDER_NAMES, VERIFICATION_TYPE_NAMES } from '../db/schema/zk-verifications';

export interface VerificationStatus {
  twitter: boolean;
  discord: boolean;
  github: boolean;
  telegram: boolean;
  verificationCount: number;
  votingWeight: number;
}

export interface ProviderVerificationInfo {
  twitter: boolean;
  discord: boolean;
  github: boolean;
  telegram: boolean;
  count: number;
}

export interface DetailedVerificationStatus extends VerificationStatus {
  byProvider: {
    [key in ZKProvider]: ProviderVerificationInfo;
  };
  oauth: ProviderVerificationInfo; // OAuth verifications
  byType: {
    ZK: ProviderVerificationInfo;
    OAUTH: ProviderVerificationInfo;
  };
}

export interface ProviderInfo {
  provider: ZKProvider;
  name: string;
  isEnabled: boolean;
  description?: string;
}

export interface VerificationResult {
  success: boolean;
  error?: string;
  verification?: NewZKVerification;
}

export class ZKVerificationService {
  /**
   * Verify and store a social account proof
   * Multi-provider: users can verify same social type with different providers
   */
  async verifyAndStore(
    chainId: number,
    address: string,
    socialType: SocialType,
    provider: ZKProvider,
    nullifier: string,
    transactionHash?: string,
    metadata?: string
  ): Promise<VerificationResult> {
    const normalizedAddress = address.toLowerCase();

    // 1. Check if provider is enabled
    const isProviderEnabled = await this.isProviderEnabled(chainId, provider);
    if (!isProviderEnabled) {
      return { success: false, error: `Provider ${provider} is not enabled` };
    }

    // 2. Check premium status (ZK verification is premium-only)
    const isPremium = await premiumService.isPremiumOrStaked(chainId, normalizedAddress);
    if (!isPremium) {
      return { success: false, error: 'Premium access required for ZK verification' };
    }

    // 3. Check if nullifier is already used (sybil prevention - global across all providers)
    const existingNullifier = await this.getByNullifier(nullifier);
    if (existingNullifier) {
      return { success: false, error: 'This social account is already verified by another address' };
    }

    // 4. Check if user already has this social type verified with THIS provider
    const existingVerification = await this.getVerificationWithProvider(
      chainId,
      normalizedAddress,
      provider,
      socialType
    );
    if (existingVerification?.isActive) {
      return { success: false, error: `${socialType} is already verified with ${ZK_PROVIDER_NAMES[provider]}` };
    }

    // 5. Store verification
    try {
      const [verification] = await db
        .insert(zkVerifications)
        .values({
          chainId,
          address: normalizedAddress,
          socialType,
          verificationType: 'ZK',
          provider,
          nullifier,
          isActive: true,
          verifiedAt: new Date(),
          transactionHash,
          metadata,
        })
        .returning();

      // 6. Log event
      await this.logEvent({
        chainId,
        address: normalizedAddress,
        eventType: 'VERIFY',
        socialType,
        verificationType: 'ZK',
        provider,
        transactionHash,
        timestamp: new Date(),
      });

      // 7. Update stats
      await this.incrementStats(chainId, provider, socialType);

      return { success: true, verification };
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === '23505') {
        return { success: false, error: 'Verification already exists or nullifier already used' };
      }
      throw error;
    }
  }

  /**
   * Get verification by nullifier
   */
  async getByNullifier(nullifier: string) {
    const [verification] = await db
      .select()
      .from(zkVerifications)
      .where(eq(zkVerifications.nullifier, nullifier))
      .limit(1);

    return verification || null;
  }

  /**
   * Get specific verification for a user with a specific provider
   */
  async getVerificationWithProvider(
    chainId: number,
    address: string,
    provider: ZKProvider,
    socialType: SocialType
  ) {
    const [verification] = await db
      .select()
      .from(zkVerifications)
      .where(
        and(
          eq(zkVerifications.chainId, chainId),
          eq(zkVerifications.address, address.toLowerCase()),
          eq(zkVerifications.provider, provider),
          eq(zkVerifications.socialType, socialType)
        )
      )
      .limit(1);

    return verification || null;
  }

  /**
   * Get all verifications for a user (all providers)
   */
  async getUserVerifications(chainId: number, address: string) {
    return db
      .select()
      .from(zkVerifications)
      .where(
        and(
          eq(zkVerifications.chainId, chainId),
          eq(zkVerifications.address, address.toLowerCase()),
          eq(zkVerifications.isActive, true)
        )
      );
  }

  /**
   * Get verifications for a user with a specific provider
   */
  async getUserVerificationsByProvider(chainId: number, address: string, provider: ZKProvider) {
    return db
      .select()
      .from(zkVerifications)
      .where(
        and(
          eq(zkVerifications.chainId, chainId),
          eq(zkVerifications.address, address.toLowerCase()),
          eq(zkVerifications.provider, provider),
          eq(zkVerifications.isActive, true)
        )
      );
  }

  /**
   * Get simple verification status for a user (any provider)
   * Voting weight is based on unique social types verified
   */
  async getVerificationStatus(chainId: number, address: string): Promise<VerificationStatus> {
    const verifications = await this.getUserVerifications(chainId, address);

    const verifiedSocialTypes = new Set<string>();
    const status: VerificationStatus = {
      twitter: false,
      discord: false,
      github: false,
      telegram: false,
      verificationCount: 0,
      votingWeight: 1, // Base weight
    };

    for (const v of verifications) {
      // Only count unique social types for voting weight
      if (!verifiedSocialTypes.has(v.socialType)) {
        verifiedSocialTypes.add(v.socialType);
        status.verificationCount++;
      }

      switch (v.socialType) {
        case 'TWITTER':
          status.twitter = true;
          break;
        case 'DISCORD':
          status.discord = true;
          break;
        case 'GITHUB':
          status.github = true;
          break;
        case 'TELEGRAM':
          status.telegram = true;
          break;
      }
    }

    // Voting weight = 1 (base) + unique social types verified
    status.votingWeight = 1 + status.verificationCount;

    return status;
  }

  /**
   * Get detailed verification status including per-provider and per-type breakdown
   */
  async getDetailedVerificationStatus(
    chainId: number,
    address: string
  ): Promise<DetailedVerificationStatus> {
    const verifications = await this.getUserVerifications(chainId, address);
    const baseStatus = await this.getVerificationStatus(chainId, address);

    const emptyInfo = (): ProviderVerificationInfo => ({
      twitter: false,
      discord: false,
      github: false,
      telegram: false,
      count: 0,
    });

    const byProvider: DetailedVerificationStatus['byProvider'] = {
      RECLAIM: emptyInfo(),
      POLYGON_ID: emptyInfo(),
      ZKPASS: emptyInfo(),
      WORLD_ID: emptyInfo(),
    };

    const oauth = emptyInfo();

    const byType: DetailedVerificationStatus['byType'] = {
      ZK: emptyInfo(),
      OAUTH: emptyInfo(),
    };

    for (const v of verifications) {
      const socialKey = v.socialType.toLowerCase() as keyof ProviderVerificationInfo;
      const verificationType = (v.verificationType || 'ZK') as VerificationType;

      // Update per-type breakdown
      if (byType[verificationType] && socialKey in byType[verificationType]) {
        (byType[verificationType] as any)[socialKey] = true;
        byType[verificationType].count++;
      }

      if (verificationType === 'OAUTH' || v.provider === 'OAUTH') {
        // OAuth verification
        if (socialKey in oauth) {
          (oauth as any)[socialKey] = true;
          oauth.count++;
        }
      } else {
        // ZK provider verification
        const provider = v.provider as ZKProvider;
        if (byProvider[provider] && socialKey in byProvider[provider]) {
          (byProvider[provider] as any)[socialKey] = true;
          byProvider[provider].count++;
        }
      }
    }

    return {
      ...baseStatus,
      byProvider,
      oauth,
      byType,
    };
  }

  /**
   * Check if user meets poll requirements
   */
  async meetsRequirements(
    chainId: number,
    address: string,
    requiredProviders: ZKProvider[],
    requiredSocialTypes: SocialType[]
  ): Promise<boolean> {
    const verifications = await this.getUserVerifications(chainId, address);

    for (const v of verifications) {
      const providerMatch =
        requiredProviders.length === 0 || requiredProviders.includes(v.provider as ZKProvider);
      const socialMatch =
        requiredSocialTypes.length === 0 || requiredSocialTypes.includes(v.socialType as SocialType);

      if (providerMatch && socialMatch) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user can claim rewards (requires at least one verification)
   */
  async canClaimRewards(chainId: number, address: string): Promise<boolean> {
    const status = await this.getVerificationStatus(chainId, address);
    return status.verificationCount > 0;
  }

  /**
   * Check if user can access ZK features (premium check)
   */
  async canAccessZKFeatures(chainId: number, address: string): Promise<boolean> {
    return premiumService.isPremiumOrStaked(chainId, address);
  }

  /**
   * Check if a provider is enabled
   */
  async isProviderEnabled(chainId: number, provider: ZKProvider): Promise<boolean> {
    const [config] = await db
      .select()
      .from(zkProviderConfig)
      .where(
        and(eq(zkProviderConfig.chainId, chainId), eq(zkProviderConfig.provider, provider))
      )
      .limit(1);

    // Default to enabled if no config exists
    return config?.isEnabled ?? true;
  }

  /**
   * Get all providers with their status
   */
  async getProviders(chainId: number): Promise<ProviderInfo[]> {
    const configs = await db
      .select()
      .from(zkProviderConfig)
      .where(eq(zkProviderConfig.chainId, chainId));

    const configMap = new Map(configs.map((c) => [c.provider, c]));

    // Return all providers with their status
    return Object.values(ZKProvider).map((provider) => {
      const config = configMap.get(provider);
      return {
        provider,
        name: ZK_PROVIDER_NAMES[provider],
        isEnabled: config?.isEnabled ?? true, // Default enabled
        description: config?.description || undefined,
      };
    });
  }

  /**
   * Set provider enabled status (admin only)
   */
  async setProviderEnabled(
    chainId: number,
    provider: ZKProvider,
    enabled: boolean
  ): Promise<void> {
    const [existing] = await db
      .select()
      .from(zkProviderConfig)
      .where(
        and(eq(zkProviderConfig.chainId, chainId), eq(zkProviderConfig.provider, provider))
      )
      .limit(1);

    if (existing) {
      await db
        .update(zkProviderConfig)
        .set({ isEnabled: enabled, updatedAt: new Date() })
        .where(eq(zkProviderConfig.id, existing.id));
    } else {
      await db.insert(zkProviderConfig).values({
        chainId,
        provider,
        isEnabled: enabled,
        displayName: ZK_PROVIDER_NAMES[provider],
      });
    }
  }

  /**
   * Revoke a verification with specific provider (admin only)
   */
  async revokeVerificationWithProvider(
    chainId: number,
    address: string,
    provider: ZKProvider,
    socialType: SocialType
  ): Promise<boolean> {
    const verification = await this.getVerificationWithProvider(chainId, address, provider, socialType);
    if (!verification || !verification.isActive) {
      return false;
    }

    await db
      .update(zkVerifications)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(zkVerifications.id, verification.id));

    await this.logEvent({
      chainId,
      address: address.toLowerCase(),
      eventType: 'REVOKE',
      socialType,
      verificationType: 'ZK',
      provider,
      timestamp: new Date(),
    });

    await this.decrementStats(chainId, provider, socialType);

    return true;
  }

  /**
   * Revoke all verifications for a social type (all providers) - admin only
   */
  async revokeAllVerifications(
    chainId: number,
    address: string,
    socialType: SocialType
  ): Promise<number> {
    const verifications = await db
      .select()
      .from(zkVerifications)
      .where(
        and(
          eq(zkVerifications.chainId, chainId),
          eq(zkVerifications.address, address.toLowerCase()),
          eq(zkVerifications.socialType, socialType),
          eq(zkVerifications.isActive, true)
        )
      );

    let revokedCount = 0;
    for (const v of verifications) {
      await db
        .update(zkVerifications)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(zkVerifications.id, v.id));

      await this.logEvent({
        chainId,
        address: address.toLowerCase(),
        eventType: 'REVOKE',
        socialType,
        verificationType: (v.verificationType || 'ZK') as VerificationType,
        provider: v.provider,
        timestamp: new Date(),
      });

      await this.decrementStats(chainId, v.provider as ZKProvider, socialType);
      revokedCount++;
    }

    return revokedCount;
  }

  /**
   * Log verification event
   */
  async logEvent(data: NewZKVerificationEvent) {
    const [event] = await db
      .insert(zkVerificationEvents)
      .values({
        ...data,
        address: data.address.toLowerCase(),
      })
      .returning();

    return event;
  }

  /**
   * Get verification events for a user
   */
  async getEvents(chainId: number, address: string, limit = 50) {
    return db
      .select()
      .from(zkVerificationEvents)
      .where(
        and(
          eq(zkVerificationEvents.chainId, chainId),
          eq(zkVerificationEvents.address, address.toLowerCase())
        )
      )
      .orderBy(desc(zkVerificationEvents.timestamp))
      .limit(limit);
  }

  /**
   * Get or create verification stats for a provider
   */
  async getStats(chainId: number, provider?: ZKProvider) {
    const condition = provider
      ? and(eq(zkVerificationStats.chainId, chainId), eq(zkVerificationStats.provider, provider))
      : and(eq(zkVerificationStats.chainId, chainId), isNull(zkVerificationStats.provider));

    const [stats] = await db
      .select()
      .from(zkVerificationStats)
      .where(condition)
      .limit(1);

    if (stats) return stats;

    const [newStats] = await db
      .insert(zkVerificationStats)
      .values({
        chainId,
        provider: provider || null,
        totalVerifications: 0,
        twitterVerifications: 0,
        discordVerifications: 0,
        githubVerifications: 0,
        telegramVerifications: 0,
        uniqueUsers: 0,
      })
      .returning();

    return newStats;
  }

  /**
   * Get aggregate stats (all providers combined)
   */
  async getAggregateStats(chainId: number) {
    return this.getStats(chainId); // null provider = aggregate
  }

  /**
   * Get stats by provider
   */
  async getStatsByProvider(chainId: number) {
    const providers = Object.values(ZKProvider);
    const stats: { [key in ZKProvider]?: any } = {};

    for (const provider of providers) {
      stats[provider] = await this.getStats(chainId, provider);
    }

    return stats;
  }

  /**
   * Increment stats for a social type and provider
   */
  private async incrementStats(chainId: number, provider: ZKProvider, socialType: SocialType) {
    // Update provider-specific stats
    await this.updateStatCount(chainId, provider, socialType, 1);

    // Update aggregate stats
    await this.updateStatCount(chainId, undefined, socialType, 1);
  }

  /**
   * Decrement stats for a social type and provider
   */
  private async decrementStats(chainId: number, provider: ZKProvider, socialType: SocialType) {
    // Update provider-specific stats
    await this.updateStatCount(chainId, provider, socialType, -1);

    // Update aggregate stats
    await this.updateStatCount(chainId, undefined, socialType, -1);
  }

  /**
   * Update stat count
   */
  private async updateStatCount(
    chainId: number,
    provider: ZKProvider | undefined,
    socialType: SocialType,
    delta: number
  ) {
    const stats = await this.getStats(chainId, provider);
    const socialColumn = `${socialType.toLowerCase()}Verifications` as keyof typeof stats;

    const newTotal = Math.max(0, (stats.totalVerifications || 0) + delta);
    const newSocialCount = Math.max(
      0,
      ((stats as Record<string, unknown>)[socialColumn] as number || 0) + delta
    );

    const condition = provider
      ? and(eq(zkVerificationStats.chainId, chainId), eq(zkVerificationStats.provider, provider))
      : and(eq(zkVerificationStats.chainId, chainId), isNull(zkVerificationStats.provider));

    await db
      .update(zkVerificationStats)
      .set({
        totalVerifications: newTotal,
        [socialColumn]: newSocialCount,
        updatedAt: new Date(),
      })
      .where(condition);
  }

  /**
   * Get leaderboard of most verified users
   */
  async getVerificationLeaderboard(chainId: number, limit = 20) {
    // Count unique social types per user (not total verifications across providers)
    const result = await db
      .select({
        address: zkVerifications.address,
        verificationCount: sql<number>`count(distinct ${zkVerifications.socialType})`.as(
          'verification_count'
        ),
      })
      .from(zkVerifications)
      .where(and(eq(zkVerifications.chainId, chainId), eq(zkVerifications.isActive, true)))
      .groupBy(zkVerifications.address)
      .orderBy(desc(sql`count(distinct ${zkVerifications.socialType})`))
      .limit(limit);

    return result.map((r) => ({
      address: r.address,
      verificationCount: Number(r.verificationCount),
      votingWeight: 1 + Number(r.verificationCount),
    }));
  }
}

// Export singleton instance
export const zkVerificationService = new ZKVerificationService();
