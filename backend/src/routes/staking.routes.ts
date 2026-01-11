/**
 * Staking API routes
 */

import { Router, Request, Response } from 'express';
import { stakingService } from '../services/staking.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

// Validation schemas
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address');
const chainIdSchema = z.coerce.number().int().positive();

/**
 * GET /api/staking/stats
 * Get global staking statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);

    const stats = await stakingService.getStats(chainId);

    res.json({
      chainId,
      stats: {
        totalStaked: stats.totalStaked,
        totalStakers: stats.totalStakers,
        totalPremiumStakers: stats.totalPremiumStakers,
        totalRewardsDistributed: stats.totalRewardsDistributed,
        rewardRatePerSecond: stats.rewardRatePerSecond,
        minimumStakeForPremium: stats.minimumStakeForPremium,
      },
    });
  } catch (error) {
    logger.error('Failed to get staking stats', { error });
    res.status(500).json({ error: 'Failed to fetch staking statistics' });
  }
});

/**
 * GET /api/staking/:address
 * Get stake info for an address
 */
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const validatedAddress = addressSchema.parse(address);
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);

    const stake = await stakingService.getByAddress(chainId, validatedAddress);

    if (!stake) {
      return res.json({
        address: validatedAddress,
        chainId,
        stake: null,
        isPremium: false,
      });
    }

    res.json({
      address: validatedAddress,
      chainId,
      stake: {
        amount: stake.amount,
        stakingStartTime: stake.stakingStartTime,
        lastRewardClaim: stake.lastRewardClaim,
        totalRewardsClaimed: stake.totalRewardsClaimed,
        isActive: stake.isActive,
        isPremium: stake.isPremium,
      },
      isPremium: stake.isPremium,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid address format' });
    }
    logger.error('Failed to get stake info', { error });
    res.status(500).json({ error: 'Failed to fetch stake info' });
  }
});

/**
 * GET /api/staking/:address/events
 * Get staking events for an address
 */
router.get('/:address/events', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const validatedAddress = addressSchema.parse(address);
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const events = await stakingService.getEvents(chainId, validatedAddress, limit);

    res.json({
      address: validatedAddress,
      chainId,
      events,
      meta: {
        limit,
        count: events.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid address format' });
    }
    logger.error('Failed to get staking events', { error });
    res.status(500).json({ error: 'Failed to fetch staking events' });
  }
});

/**
 * GET /api/staking/:address/premium
 * Check if address has premium via staking
 */
router.get('/:address/premium', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const validatedAddress = addressSchema.parse(address);
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);

    const isPremium = await stakingService.isPremiumByStaking(chainId, validatedAddress);

    res.json({
      address: validatedAddress,
      chainId,
      isPremiumByStaking: isPremium,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid address format' });
    }
    logger.error('Failed to check premium status', { error });
    res.status(500).json({ error: 'Failed to check premium status' });
  }
});

/**
 * GET /api/staking/premium/stakers
 * Get all premium stakers
 */
router.get('/premium/stakers', async (req: Request, res: Response) => {
  try {
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);

    const stakers = await stakingService.getPremiumStakers(chainId);

    res.json({
      chainId,
      stakers: stakers.map((s) => ({
        address: s.address,
        amount: s.amount,
        stakingStartTime: s.stakingStartTime,
      })),
      count: stakers.length,
    });
  } catch (error) {
    logger.error('Failed to get premium stakers', { error });
    res.status(500).json({ error: 'Failed to fetch premium stakers' });
  }
});

export default router;
