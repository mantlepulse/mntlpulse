/**
 * Leaderboard API routes
 */

import { Router, Request, Response } from 'express';
import { leaderboardService } from '../services/leaderboard.service';
import { logger } from '../utils/logger';
import { Address } from 'viem';

const router = Router();

/**
 * GET /api/leaderboard
 * Get comprehensive leaderboard with all rankings
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const leaderboard = await leaderboardService.getComprehensive(limit);

    res.json(leaderboard);
  } catch (error) {
    logger.error('Failed to get leaderboard', { error });
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboard/rewards
 * Get top users by total rewards
 */
router.get('/rewards', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const users = await leaderboardService.getTopByRewards(limit, offset);

    res.json({
      users,
      meta: {
        limit,
        offset,
        count: users.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get top by rewards', { error });
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboard/votes
 * Get top users by total votes
 */
router.get('/votes', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const users = await leaderboardService.getTopByVotes(limit, offset);

    res.json({
      users,
      meta: {
        limit,
        offset,
        count: users.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get top by votes', { error });
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboard/creators
 * Get top users by polls created
 */
router.get('/creators', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const users = await leaderboardService.getTopByPollsCreated(limit, offset);

    res.json({
      users,
      meta: {
        limit,
        offset,
        count: users.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get top creators', { error });
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboard/participation
 * Get top users by polls participated
 */
router.get('/participation', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const users = await leaderboardService.getTopByParticipation(limit, offset);

    res.json({
      users,
      meta: {
        limit,
        offset,
        count: users.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get top by participation', { error });
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboard/stats
 * Get total platform statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await leaderboardService.getTotalStats();

    res.json({ stats });
  } catch (error) {
    logger.error('Failed to get total stats', { error });
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/leaderboard/user/:address
 * Get user statistics and rankings
 */
router.get('/user/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const [stats, rewardsRank, votesRank] = await Promise.all([
      leaderboardService.getUserStats(address as Address),
      leaderboardService.getUserRankByRewards(address as Address),
      leaderboardService.getUserRankByVotes(address as Address),
    ]);

    res.json({
      address,
      stats,
      rankings: {
        byRewards: rewardsRank,
        byVotes: votesRank,
      },
    });
  } catch (error) {
    logger.error('Failed to get user stats', { error });
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

export default router;
