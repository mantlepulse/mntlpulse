/**
 * Membership API routes
 * Handles tier management, daily vote limits, and tier progression
 */

import { Router, Request, Response } from 'express';
import { membershipService } from '../services/membership.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/membership/tiers
 * Get all membership tier definitions
 */
router.get('/tiers', async (req: Request, res: Response) => {
  try {
    const tiers = await membershipService.getAllTiers();
    res.json({ tiers });
  } catch (error) {
    logger.error('Failed to get membership tiers', { error });
    res.status(500).json({ error: 'Failed to fetch membership tiers' });
  }
});

/**
 * GET /api/membership/:address
 * Get user's current membership status with tier details
 */
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { membership, tier } = await membershipService.getUserMembershipWithTier(address);

    res.json({
      membership: {
        address: membership.address,
        currentTier: membership.currentTier,
        tierName: tier?.name || 'Bronze',
        tierUpdatedAt: membership.tierUpdatedAt,
        stats: {
          pollsParticipated: membership.pollsParticipated,
          totalVotesCast: membership.totalVotesCast,
          pollsCreated: membership.pollsCreated,
          seasonsCompleted: membership.seasonsCompleted,
        },
      },
      tier: tier || null,
    });
  } catch (error) {
    logger.error('Failed to get user membership', { error });
    res.status(500).json({ error: 'Failed to fetch user membership' });
  }
});

/**
 * POST /api/membership/:address/check
 * Recalculate and update user's tier based on their activity
 */
router.post('/:address/check', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const membership = await membershipService.checkAndUpdateTier(address);
    const tier = await membershipService.getTierBySlug(membership.currentTier);

    res.json({
      success: true,
      membership: {
        address: membership.address,
        currentTier: membership.currentTier,
        tierName: tier?.name || 'Bronze',
        tierUpdatedAt: membership.tierUpdatedAt,
      },
    });
  } catch (error) {
    logger.error('Failed to check user tier', { error });
    res.status(500).json({ error: 'Failed to check user tier' });
  }
});

/**
 * GET /api/membership/:address/daily-votes
 * Get user's daily vote count and remaining votes
 */
router.get('/:address/daily-votes', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const info = await membershipService.getVoteLimitInfo(address);

    res.json(info);
  } catch (error) {
    logger.error('Failed to get daily vote info', { error });
    res.status(500).json({ error: 'Failed to fetch daily vote info' });
  }
});

/**
 * POST /api/membership/:address/vote
 * Record a vote and increment daily count
 * Called internally when user votes on a poll
 */
router.post('/:address/vote', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // Check if user can vote
    const { canVote, remaining, limit } = await membershipService.canUserVote(address);
    if (!canVote) {
      return res.status(429).json({
        error: 'Daily vote limit reached',
        limit,
        remaining: 0,
      });
    }

    // Increment vote count
    await membershipService.incrementDailyVoteCount(address);

    res.json({
      success: true,
      remaining: remaining - 1,
      limit,
    });
  } catch (error) {
    logger.error('Failed to record vote', { error });
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

export default router;
