/**
 * ZK Verification API Routes
 * Multi-provider endpoints for ZK-based identity verification
 * Supports: Reclaim Protocol, Polygon ID, zkPass, World ID
 */

import { Router, Request, Response } from 'express';
import {
  zkVerificationService,
  SocialType,
  ZKProvider,
  ZK_PROVIDER_NAMES,
} from '../services/zk-verification.service';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { env } from '../config/env';

const router = Router();

// Validation schemas
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address');
const chainIdSchema = z.coerce.number().int().positive();
const socialTypeSchema = z.enum(['TWITTER', 'DISCORD', 'GITHUB', 'TELEGRAM']);
const providerSchema = z.enum(['RECLAIM', 'POLYGON_ID', 'ZKPASS', 'WORLD_ID']);
const nullifierSchema = z.string().min(1, 'Nullifier is required');

/**
 * GET /api/zk-verification/status/:address
 * Get ZK verification status for an address (simple view - any provider)
 */
router.get('/status/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const validatedAddress = addressSchema.parse(address);
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);

    const status = await zkVerificationService.getVerificationStatus(chainId, validatedAddress);
    const canAccess = await zkVerificationService.canAccessZKFeatures(chainId, validatedAddress);

    res.json({
      address: validatedAddress,
      chainId,
      enabled: env.ZK_VERIFICATION_ENABLED,
      canAccessZKFeatures: canAccess,
      ...status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid address format' });
    }
    logger.error('Failed to get ZK verification status', { error });
    res.status(500).json({ error: 'Failed to fetch ZK verification status' });
  }
});

/**
 * GET /api/zk-verification/status/:address/detailed
 * Get detailed verification status with per-provider breakdown
 */
router.get('/status/:address/detailed', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const validatedAddress = addressSchema.parse(address);
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);

    const status = await zkVerificationService.getDetailedVerificationStatus(
      chainId,
      validatedAddress
    );
    const canAccess = await zkVerificationService.canAccessZKFeatures(chainId, validatedAddress);

    res.json({
      address: validatedAddress,
      chainId,
      enabled: env.ZK_VERIFICATION_ENABLED,
      canAccessZKFeatures: canAccess,
      ...status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid address format' });
    }
    logger.error('Failed to get detailed ZK verification status', { error });
    res.status(500).json({ error: 'Failed to fetch ZK verification status' });
  }
});

/**
 * POST /api/zk-verification/verify
 * Submit a ZK proof for verification with a specific provider
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    if (!env.ZK_VERIFICATION_ENABLED) {
      return res.status(503).json({ error: 'ZK verification is currently disabled' });
    }

    const { address, socialType, provider, nullifier, transactionHash, chainId, metadata } =
      req.body;

    // Validate inputs
    const validatedAddress = addressSchema.parse(address);
    const validatedSocialType = socialTypeSchema.parse(socialType) as SocialType;
    const validatedProvider = providerSchema.parse(provider) as ZKProvider;
    const validatedNullifier = nullifierSchema.parse(nullifier);
    const validatedChainId = chainIdSchema.parse(chainId || 8453);

    const result = await zkVerificationService.verifyAndStore(
      validatedChainId,
      validatedAddress,
      validatedSocialType,
      validatedProvider,
      validatedNullifier,
      transactionHash,
      metadata
    );

    if (result.success) {
      res.json({
        success: true,
        message: `${validatedSocialType} verification successful with ${ZK_PROVIDER_NAMES[validatedProvider]}`,
        verification: {
          socialType: validatedSocialType,
          provider: validatedProvider,
          providerName: ZK_PROVIDER_NAMES[validatedProvider],
          verifiedAt: result.verification?.verifiedAt,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request parameters', details: error.issues });
    }
    logger.error('Failed to process ZK verification', { error });
    res.status(500).json({ error: 'Failed to process verification' });
  }
});

/**
 * GET /api/zk-verification/providers
 * Get list of available ZK providers and their status
 */
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);

    const providers = await zkVerificationService.getProviders(chainId);

    res.json({
      chainId,
      providers,
    });
  } catch (error) {
    logger.error('Failed to get providers', { error });
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

/**
 * POST /api/zk-verification/meets-requirements
 * Check if user meets specific ZK requirements for a poll
 */
router.post('/meets-requirements', async (req: Request, res: Response) => {
  try {
    const { address, requiredProviders, requiredSocialTypes, chainId } = req.body;

    const validatedAddress = addressSchema.parse(address);
    const validatedChainId = chainIdSchema.parse(chainId || 8453);

    // Validate arrays
    const validatedProviders: ZKProvider[] = [];
    if (Array.isArray(requiredProviders)) {
      for (const p of requiredProviders) {
        validatedProviders.push(providerSchema.parse(p) as ZKProvider);
      }
    }

    const validatedSocialTypes: SocialType[] = [];
    if (Array.isArray(requiredSocialTypes)) {
      for (const s of requiredSocialTypes) {
        validatedSocialTypes.push(socialTypeSchema.parse(s) as SocialType);
      }
    }

    const meetsRequirements = await zkVerificationService.meetsRequirements(
      validatedChainId,
      validatedAddress,
      validatedProviders,
      validatedSocialTypes
    );

    res.json({
      address: validatedAddress,
      chainId: validatedChainId,
      meetsRequirements,
      requiredProviders: validatedProviders,
      requiredSocialTypes: validatedSocialTypes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request parameters', details: error.issues });
    }
    logger.error('Failed to check requirements', { error });
    res.status(500).json({ error: 'Failed to check requirements' });
  }
});

/**
 * GET /api/zk-verification/can-claim/:address
 * Check if user can claim rewards (requires at least one verification)
 */
router.get('/can-claim/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const validatedAddress = addressSchema.parse(address);
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);

    const canClaim = await zkVerificationService.canClaimRewards(chainId, validatedAddress);
    const status = await zkVerificationService.getVerificationStatus(chainId, validatedAddress);

    res.json({
      address: validatedAddress,
      chainId,
      canClaim,
      verificationCount: status.verificationCount,
      votingWeight: status.votingWeight,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid address format' });
    }
    logger.error('Failed to check claim eligibility', { error });
    res.status(500).json({ error: 'Failed to check claim eligibility' });
  }
});

/**
 * GET /api/zk-verification/verifications/:address
 * Get all verifications for an address (all providers)
 */
router.get('/verifications/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const validatedAddress = addressSchema.parse(address);
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);
    const provider = req.query.provider as string | undefined;

    let verifications;
    if (provider) {
      const validatedProvider = providerSchema.parse(provider) as ZKProvider;
      verifications = await zkVerificationService.getUserVerificationsByProvider(
        chainId,
        validatedAddress,
        validatedProvider
      );
    } else {
      verifications = await zkVerificationService.getUserVerifications(chainId, validatedAddress);
    }

    res.json({
      address: validatedAddress,
      chainId,
      provider: provider || 'all',
      verifications: verifications.map((v) => ({
        socialType: v.socialType,
        provider: v.provider,
        providerName: ZK_PROVIDER_NAMES[v.provider as ZKProvider] || v.provider,
        verifiedAt: v.verifiedAt,
        isActive: v.isActive,
      })),
      count: verifications.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }
    logger.error('Failed to get verifications', { error });
    res.status(500).json({ error: 'Failed to fetch verifications' });
  }
});

/**
 * GET /api/zk-verification/:address/events
 * Get verification events for an address
 */
router.get('/:address/events', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const validatedAddress = addressSchema.parse(address);
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const events = await zkVerificationService.getEvents(chainId, validatedAddress, limit);

    res.json({
      address: validatedAddress,
      chainId,
      events: events.map((e) => ({
        ...e,
        providerName: e.provider ? ZK_PROVIDER_NAMES[e.provider as ZKProvider] || e.provider : null,
      })),
      meta: {
        limit,
        count: events.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid address format' });
    }
    logger.error('Failed to get verification events', { error });
    res.status(500).json({ error: 'Failed to fetch verification events' });
  }
});

/**
 * GET /api/zk-verification/stats
 * Get ZK verification statistics (aggregate)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);

    const aggregateStats = await zkVerificationService.getAggregateStats(chainId);
    const byProvider = await zkVerificationService.getStatsByProvider(chainId);

    res.json({
      chainId,
      enabled: env.ZK_VERIFICATION_ENABLED,
      aggregate: {
        totalVerifications: aggregateStats.totalVerifications,
        twitterVerifications: aggregateStats.twitterVerifications,
        discordVerifications: aggregateStats.discordVerifications,
        githubVerifications: aggregateStats.githubVerifications,
        telegramVerifications: aggregateStats.telegramVerifications,
        uniqueUsers: aggregateStats.uniqueUsers,
      },
      byProvider: Object.fromEntries(
        Object.entries(byProvider).map(([provider, stats]) => [
          provider,
          {
            name: ZK_PROVIDER_NAMES[provider as ZKProvider],
            totalVerifications: stats?.totalVerifications || 0,
            twitterVerifications: stats?.twitterVerifications || 0,
            discordVerifications: stats?.discordVerifications || 0,
            githubVerifications: stats?.githubVerifications || 0,
            telegramVerifications: stats?.telegramVerifications || 0,
          },
        ])
      ),
    });
  } catch (error) {
    logger.error('Failed to get verification stats', { error });
    res.status(500).json({ error: 'Failed to fetch verification statistics' });
  }
});

/**
 * GET /api/zk-verification/leaderboard
 * Get top verified users
 */
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const leaderboard = await zkVerificationService.getVerificationLeaderboard(chainId, limit);

    res.json({
      chainId,
      leaderboard,
      meta: {
        limit,
        count: leaderboard.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get verification leaderboard', { error });
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/zk-verification/config
 * Get ZK verification configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);
    const providers = await zkVerificationService.getProviders(chainId);

    res.json({
      enabled: env.ZK_VERIFICATION_ENABLED,
      supportedSocialTypes: ['TWITTER', 'DISCORD', 'GITHUB', 'TELEGRAM'],
      supportedProviders: providers,
      benefits: {
        votingWeight: 'Base weight 1x + 1x per unique verified social (max 5x)',
        rewardEligibility: 'At least 1 verification required',
        zkProtectedPolls: 'Access to polls requiring ZK verification',
        badge: 'Verified badge displayed on profile',
        multiProvider: 'Verify with multiple providers for flexibility',
      },
      requirements: {
        premiumRequired: true,
        description: 'ZK verification is a premium feature. Subscribe or stake PULSE to unlock.',
      },
    });
  } catch (error) {
    logger.error('Failed to get ZK config', { error });
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

/**
 * DELETE /api/zk-verification/revoke (Admin only)
 * Revoke a verification for a specific provider
 */
router.delete('/revoke', async (req: Request, res: Response) => {
  try {
    // TODO: Add admin authentication middleware
    const { address, socialType, provider, chainId } = req.body;

    const validatedAddress = addressSchema.parse(address);
    const validatedSocialType = socialTypeSchema.parse(socialType) as SocialType;
    const validatedChainId = chainIdSchema.parse(chainId || 8453);

    let success: boolean | number;
    let message: string;

    if (provider) {
      // Revoke for specific provider
      const validatedProvider = providerSchema.parse(provider) as ZKProvider;
      success = await zkVerificationService.revokeVerificationWithProvider(
        validatedChainId,
        validatedAddress,
        validatedProvider,
        validatedSocialType
      );
      message = `${validatedSocialType} verification with ${ZK_PROVIDER_NAMES[validatedProvider]} revoked for ${validatedAddress}`;
    } else {
      // Revoke for all providers
      success = await zkVerificationService.revokeAllVerifications(
        validatedChainId,
        validatedAddress,
        validatedSocialType
      );
      message = `${success} ${validatedSocialType} verification(s) revoked for ${validatedAddress}`;
    }

    if (success) {
      res.json({
        success: true,
        message,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Verification not found or already inactive',
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    logger.error('Failed to revoke verification', { error });
    res.status(500).json({ error: 'Failed to revoke verification' });
  }
});

/**
 * PUT /api/zk-verification/admin/provider (Admin only)
 * Enable/disable a provider
 */
router.put('/admin/provider', async (req: Request, res: Response) => {
  try {
    // TODO: Add admin authentication middleware
    const { provider, enabled, chainId } = req.body;

    const validatedProvider = providerSchema.parse(provider) as ZKProvider;
    const validatedChainId = chainIdSchema.parse(chainId || 8453);
    const validatedEnabled = z.boolean().parse(enabled);

    await zkVerificationService.setProviderEnabled(
      validatedChainId,
      validatedProvider,
      validatedEnabled
    );

    res.json({
      success: true,
      message: `${ZK_PROVIDER_NAMES[validatedProvider]} ${validatedEnabled ? 'enabled' : 'disabled'}`,
      provider: validatedProvider,
      enabled: validatedEnabled,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    logger.error('Failed to update provider status', { error });
    res.status(500).json({ error: 'Failed to update provider status' });
  }
});

export default router;
