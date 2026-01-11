/**
 * Quests API routes
 */

import { Router, Request, Response } from 'express'
import { questsService } from '../services/quests.service'
import { logger } from '../utils/logger'
import { Address } from 'viem'

const router = Router()

/**
 * GET /api/quests
 * Get all active quest definitions
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined

    const quests = category
      ? await questsService.getQuestsByCategory(category)
      : await questsService.getAllQuests()

    res.json({ quests })
  } catch (error) {
    logger.error('Failed to get quests', { error })
    res.status(500).json({ error: 'Failed to fetch quests' })
  }
})

/**
 * GET /api/quests/:address
 * Get user's quest progress for all quests
 */
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params

    const quests = await questsService.getUserQuestProgress(address as Address)

    res.json({ quests })
  } catch (error) {
    logger.error('Failed to get user quest progress', { error })
    res.status(500).json({ error: 'Failed to fetch quest progress' })
  }
})

/**
 * GET /api/quests/:address/active
 * Get user's active (uncompleted) quests
 */
router.get('/:address/active', async (req: Request, res: Response) => {
  try {
    const { address } = req.params

    const quests = await questsService.getActiveQuests(address as Address)

    res.json({ quests })
  } catch (error) {
    logger.error('Failed to get active quests', { error })
    res.status(500).json({ error: 'Failed to fetch active quests' })
  }
})

/**
 * GET /api/quests/:address/completed
 * Get user's completed quests
 */
router.get('/:address/completed', async (req: Request, res: Response) => {
  try {
    const { address } = req.params

    const quests = await questsService.getCompletedQuests(address as Address)

    res.json({
      quests: quests.map(({ quest, progress }) => ({
        ...quest,
        completedAt: progress.completedAt,
      })),
    })
  } catch (error) {
    logger.error('Failed to get completed quests', { error })
    res.status(500).json({ error: 'Failed to fetch completed quests' })
  }
})

/**
 * POST /api/quests/:address/check
 * Trigger quest progress check for a user
 * This can be called manually or by webhooks/events
 */
router.post('/:address/check', async (req: Request, res: Response) => {
  try {
    const { address } = req.params

    const result = await questsService.checkProgress(address as Address)

    res.json({
      success: true,
      ...result,
    })
  } catch (error) {
    logger.error('Failed to check quest progress', { error })
    res.status(500).json({ error: 'Failed to check quest progress' })
  }
})

export default router
