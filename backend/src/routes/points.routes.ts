/**
 * Points API routes
 * Handles user points, rewards, and claiming
 */

import { Router, Request, Response } from 'express';
import { pointsService } from '../services/points.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/points/:address
 * Get user's points for current or specified season
 */
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { seasonId } = req.query;

    if (seasonId) {
      const points = await pointsService.getUserSeasonPoints(address, seasonId as string);
      return res.json({ points: points || { totalPoints: 0 } });
    }

    // Get total across all seasons
    const totals = await pointsService.getTotalPointsAllSeasons(address);
    res.json(totals);
  } catch (error) {
    logger.error('Failed to get user points', { error });
    res.status(500).json({ error: 'Failed to fetch user points' });
  }
});

/**
 * GET /api/points/:address/history
 * Get user's points transaction history
 */
router.get('/:address/history', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { seasonId, limit } = req.query;

    const history = await pointsService.getPointsHistory(
      address,
      seasonId as string | undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({ transactions: history });
  } catch (error) {
    logger.error('Failed to get points history', { error });
    res.status(500).json({ error: 'Failed to fetch points history' });
  }
});

/**
 * GET /api/points/:address/unclaimed
 * Get user's unclaimed PULSE rewards
 */
router.get('/:address/unclaimed', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const unclaimed = await pointsService.getUnclaimedRewards(address);

    const totalUnclaimed = unclaimed.reduce(
      (sum, r) => sum + BigInt(r.pulseEarned),
      BigInt(0)
    );

    res.json({
      unclaimed,
      totalUnclaimed: totalUnclaimed.toString(),
    });
  } catch (error) {
    logger.error('Failed to get unclaimed rewards', { error });
    res.status(500).json({ error: 'Failed to fetch unclaimed rewards' });
  }
});

/**
 * POST /api/points/:address/award
 * Award points to a user (internal use / admin)
 */
router.post('/:address/award', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { seasonId, amount, type, questId, description } = req.body;

    if (!seasonId || !amount || !type) {
      return res.status(400).json({ error: 'Missing required fields: seasonId, amount, type' });
    }

    const result = await pointsService.awardPoints({
      address,
      seasonId,
      amount: parseInt(amount),
      type,
      questId,
      description,
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to award points', { error });
    res.status(500).json({ error: 'Failed to award points' });
  }
});

/**
 * POST /api/points/:address/claim
 * Mark PULSE as claimed for a season
 */
router.post('/:address/claim', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { seasonId, txHash } = req.body;

    if (!seasonId || !txHash) {
      return res.status(400).json({ error: 'Missing required fields: seasonId, txHash' });
    }

    const updated = await pointsService.markPulseClaimed(address, seasonId, txHash);

    if (!updated) {
      return res.status(404).json({ error: 'Season points record not found' });
    }

    res.json({ success: true, points: updated });
  } catch (error) {
    logger.error('Failed to mark pulse claimed', { error });
    res.status(500).json({ error: 'Failed to mark pulse claimed' });
  }
});

/**
 * POST /api/points/transactions/:id/reverse
 * Reverse a points transaction (admin only)
 */
router.post('/transactions/:id/reverse', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adminAddress, reason } = req.body;

    if (!adminAddress || !reason) {
      return res.status(400).json({ error: 'Missing required fields: adminAddress, reason' });
    }

    // TODO: Add proper admin authentication
    await pointsService.reverseTransaction(id, adminAddress, reason);

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to reverse transaction', { error });
    res.status(400).json({ error: error.message || 'Failed to reverse transaction' });
  }
});

export default router;
