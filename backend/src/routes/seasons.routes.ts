/**
 * Seasons API routes
 * Handles season/tournament management for creators
 */

import { Router, Request, Response } from 'express';
import { seasonsService } from '../services/seasons.service';
import { logger } from '../utils/logger';
import { SeasonStatus } from '../db/schema';

const router = Router();

/**
 * GET /api/seasons
 * Get all seasons with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, creator, public: isPublic } = req.query;

    const seasons = await seasonsService.getAllSeasons({
      status: status as SeasonStatus | undefined,
      creatorAddress: creator as string | undefined,
      isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
    });

    res.json({ seasons });
  } catch (error) {
    logger.error('Failed to get seasons', { error });
    res.status(500).json({ error: 'Failed to fetch seasons' });
  }
});

/**
 * GET /api/seasons/active
 * Get current active seasons
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const seasons = await seasonsService.getActiveSeasons();
    res.json({ seasons });
  } catch (error) {
    logger.error('Failed to get active seasons', { error });
    res.status(500).json({ error: 'Failed to fetch active seasons' });
  }
});

/**
 * GET /api/seasons/creator/:address
 * Get all seasons by a creator
 */
router.get('/creator/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const seasons = await seasonsService.getSeasonsByCreator(address);
    res.json({ seasons });
  } catch (error) {
    logger.error('Failed to get creator seasons', { error });
    res.status(500).json({ error: 'Failed to fetch creator seasons' });
  }
});

/**
 * GET /api/seasons/:id
 * Get season by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const season = await seasonsService.getSeasonById(id);

    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }

    res.json({ season });
  } catch (error) {
    logger.error('Failed to get season', { error });
    res.status(500).json({ error: 'Failed to fetch season' });
  }
});

/**
 * GET /api/seasons/:id/leaderboard
 * Get points leaderboard for a season
 */
router.get('/:id/leaderboard', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const season = await seasonsService.getSeasonById(id);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }

    const leaderboard = await seasonsService.getSeasonLeaderboard(id, limit);

    res.json({
      season: {
        id: season.id,
        name: season.name,
        status: season.status,
        totalPulsePool: season.totalPulsePool,
        pulsePerPoint: season.pulsePerPoint,
      },
      leaderboard,
    });
  } catch (error) {
    logger.error('Failed to get season leaderboard', { error });
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * POST /api/seasons
 * Create a new season
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { creatorAddress, name, description, startTime, endTime, totalPulsePool, isPublic } = req.body;

    if (!creatorAddress || !name || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields: creatorAddress, name, startTime, endTime' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const season = await seasonsService.createSeason({
      creatorAddress,
      name,
      description,
      startTime: start,
      endTime: end,
      totalPulsePool,
      isPublic,
    });

    res.status(201).json({ season });
  } catch (error) {
    logger.error('Failed to create season', { error });
    res.status(500).json({ error: 'Failed to create season' });
  }
});

/**
 * PUT /api/seasons/:id
 * Update a season
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { creatorAddress, ...updates } = req.body;

    if (!creatorAddress) {
      return res.status(400).json({ error: 'creatorAddress is required for authorization' });
    }

    // Convert date strings to Date objects if present
    if (updates.startTime) {
      updates.startTime = new Date(updates.startTime);
    }
    if (updates.endTime) {
      updates.endTime = new Date(updates.endTime);
    }

    const season = await seasonsService.updateSeason(id, creatorAddress, updates);

    if (!season) {
      return res.status(404).json({ error: 'Season not found or not authorized' });
    }

    res.json({ season });
  } catch (error) {
    logger.error('Failed to update season', { error });
    res.status(500).json({ error: 'Failed to update season' });
  }
});

/**
 * DELETE /api/seasons/:id
 * Delete a season (only upcoming seasons with no participants)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { creatorAddress } = req.body;

    if (!creatorAddress) {
      return res.status(400).json({ error: 'creatorAddress is required for authorization' });
    }

    await seasonsService.deleteSeason(id, creatorAddress);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to delete season', { error });
    res.status(400).json({ error: error.message || 'Failed to delete season' });
  }
});

/**
 * POST /api/seasons/:id/calculate-distribution
 * Calculate PULSE distribution for an ended season (creator only)
 */
router.post('/:id/calculate-distribution', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { creatorAddress } = req.body;

    const season = await seasonsService.getSeasonById(id);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }

    if (season.creatorAddress !== creatorAddress?.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await seasonsService.calculatePulseDistribution(id);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.error('Failed to calculate distribution', { error });
    res.status(400).json({ error: error.message || 'Failed to calculate distribution' });
  }
});

/**
 * POST /api/seasons/:id/mark-distributed
 * Mark a season as fully distributed (creator only)
 */
router.post('/:id/mark-distributed', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { creatorAddress } = req.body;

    const season = await seasonsService.getSeasonById(id);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }

    if (season.creatorAddress !== creatorAddress?.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await seasonsService.markSeasonDistributed(id);
    res.json({ season: updated });
  } catch (error) {
    logger.error('Failed to mark season distributed', { error });
    res.status(500).json({ error: 'Failed to mark season distributed' });
  }
});

export default router;
