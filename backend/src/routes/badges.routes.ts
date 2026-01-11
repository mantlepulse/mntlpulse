/**
 * Badges API routes
 */

import { Router, Request, Response } from 'express'
import { questsService } from '../services/quests.service'
import { logger } from '../utils/logger'
import { Address } from 'viem'

const router = Router()

/**
 * GET /api/badges
 * Get all badge definitions
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const badges = await questsService.getAllBadges()

    res.json({ badges })
  } catch (error) {
    logger.error('Failed to get badges', { error })
    res.status(500).json({ error: 'Failed to fetch badges' })
  }
})

/**
 * GET /api/badges/:address
 * Get user's earned badges
 */
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params

    const badges = await questsService.getUserBadges(address as Address)

    res.json({
      badges: badges.map(({ badge, earnedAt, claimed }) => ({
        ...badge,
        earnedAt,
        claimed,
      })),
    })
  } catch (error) {
    logger.error('Failed to get user badges', { error })
    res.status(500).json({ error: 'Failed to fetch user badges' })
  }
})

export default router
