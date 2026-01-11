/**
 * User Preferences API routes
 */

import { Router, Request, Response } from 'express';
import { preferencesService } from '../services/preferences.service';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { Address } from 'viem';
import { apiLimiter, strictLimiter } from '../middleware/rate-limit';

const router = Router();

// Validation schemas
const updatePreferencesSchema = z.object({
  preferredToken: z.string().optional(),
  autoClaimEnabled: z.boolean().optional(),
});

/**
 * GET /api/preferences/:address
 * Get user preferences
 */
router.get('/:address', apiLimiter, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const preferences = await preferencesService.get(address as Address);

    if (!preferences) {
      // Return default preferences if none exist
      return res.json({
        preferences: {
          address: address.toLowerCase(),
          preferredToken: null,
          autoClaimEnabled: false,
        },
      });
    }

    res.json({ preferences });
  } catch (error) {
    logger.error('Failed to get user preferences', { error });
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * PUT /api/preferences/:address
 * Update user preferences
 */
router.put('/:address', strictLimiter, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const data = updatePreferencesSchema.parse(req.body);

    const preferences = await preferencesService.upsert(address as Address, data);

    logger.info('User preferences updated', {
      address,
      preferredToken: data.preferredToken,
      autoClaimEnabled: data.autoClaimEnabled,
    });

    res.json({ preferences });
  } catch (error) {
    logger.error('Failed to update preferences', { error });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * PATCH /api/preferences/:address/token
 * Update preferred token only
 */
router.patch('/:address/token', strictLimiter, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    const preferences = await preferencesService.updatePreferredToken(
      address as Address,
      token
    );

    logger.info('Preferred token updated', { address, token });

    res.json({ preferences });
  } catch (error) {
    logger.error('Failed to update preferred token', { error });
    res.status(500).json({ error: 'Failed to update preferred token' });
  }
});

/**
 * PATCH /api/preferences/:address/auto-claim
 * Update auto-claim setting only
 */
router.patch('/:address/auto-claim', strictLimiter, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const preferences = await preferencesService.updateAutoClaim(
      address as Address,
      enabled
    );

    logger.info('Auto-claim updated', { address, enabled });

    res.json({ preferences });
  } catch (error) {
    logger.error('Failed to update auto-claim', { error });
    res.status(500).json({ error: 'Failed to update auto-claim setting' });
  }
});

/**
 * DELETE /api/preferences/:address
 * Delete user preferences
 */
router.delete('/:address', strictLimiter, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const deleted = await preferencesService.delete(address as Address);

    if (!deleted) {
      return res.status(404).json({ error: 'Preferences not found' });
    }

    logger.info('User preferences deleted', { address });

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete preferences', { error });
    res.status(500).json({ error: 'Failed to delete preferences' });
  }
});

export default router;
