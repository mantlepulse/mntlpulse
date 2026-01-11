/**
 * Levels API routes
 */

import { Router, Request, Response } from 'express'
import { questsService } from '../services/quests.service'
import { logger } from '../utils/logger'
import { Address } from 'viem'

const router = Router()

/**
 * GET /api/levels/thresholds
 * Get all level thresholds
 */
router.get('/thresholds', async (req: Request, res: Response) => {
  try {
    const thresholds = await questsService.getLevelThresholds()

    res.json({ thresholds })
  } catch (error) {
    logger.error('Failed to get level thresholds', { error })
    res.status(500).json({ error: 'Failed to fetch level thresholds' })
  }
})

/**
 * GET /api/levels/leaderboard
 * Get XP leaderboard
 */
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0

    const users = await questsService.getXpLeaderboard(limit, offset)

    res.json({
      users,
      meta: {
        limit,
        offset,
        count: users.length,
      },
    })
  } catch (error) {
    logger.error('Failed to get XP leaderboard', { error })
    res.status(500).json({ error: 'Failed to fetch XP leaderboard' })
  }
})

/**
 * GET /api/levels/:address
 * Get user's XP and level info
 */
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params

    const levelInfo = await questsService.getUserLevel(address as Address)

    res.json(levelInfo)
  } catch (error) {
    logger.error('Failed to get user level', { error })
    res.status(500).json({ error: 'Failed to fetch user level' })
  }
})

export default router
