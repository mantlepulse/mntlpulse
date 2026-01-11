/**
 * Analytics API routes
 */

import { Router, Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/analytics/overview
 * Get system-wide analytics overview
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const overview = await analyticsService.getOverview();

    res.json(overview);
  } catch (error) {
    logger.error('Failed to get analytics overview', { error });
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/analytics/polls/:pollId
 * Get analytics for a specific poll
 */
router.get('/polls/:pollId', async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;

    const analytics = await analyticsService.getPollAnalytics(pollId);

    if (!analytics) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    res.json(analytics);
  } catch (error) {
    logger.error('Failed to get poll analytics', { error });
    res.status(500).json({ error: 'Failed to fetch poll analytics' });
  }
});

/**
 * GET /api/analytics/trends
 * Get participation trends over time
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const chainId = req.query.chainId ? parseInt(req.query.chainId as string) : undefined;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    const trends = await analyticsService.getParticipationTrends(chainId, days);

    res.json(trends);
  } catch (error) {
    logger.error('Failed to get trends', { error });
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

/**
 * GET /api/analytics/rewards
 * Get reward distribution analytics
 */
router.get('/rewards', async (req: Request, res: Response) => {
  try {
    const chainId = req.query.chainId ? parseInt(req.query.chainId as string) : undefined;

    const analytics = await analyticsService.getRewardAnalytics(chainId);

    res.json(analytics);
  } catch (error) {
    logger.error('Failed to get reward analytics', { error });
    res.status(500).json({ error: 'Failed to fetch reward analytics' });
  }
});

/**
 * GET /api/analytics/engagement
 * Get user engagement metrics
 */
router.get('/engagement', async (req: Request, res: Response) => {
  try {
    const engagement = await analyticsService.getUserEngagement();

    res.json(engagement);
  } catch (error) {
    logger.error('Failed to get engagement metrics', { error });
    res.status(500).json({ error: 'Failed to fetch engagement metrics' });
  }
});

/**
 * POST /api/analytics/compare
 * Compare multiple polls
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { pollIds } = req.body;

    if (!Array.isArray(pollIds) || pollIds.length === 0) {
      return res.status(400).json({ error: 'pollIds must be a non-empty array' });
    }

    if (pollIds.length > 10) {
      return res.status(400).json({ error: 'Cannot compare more than 10 polls at once' });
    }

    const comparison = await analyticsService.comparePolls(pollIds);

    res.json(comparison);
  } catch (error) {
    logger.error('Failed to compare polls', { error });
    res.status(500).json({ error: 'Failed to compare polls' });
  }
});

export default router;
