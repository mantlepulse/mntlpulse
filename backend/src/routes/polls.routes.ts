/**
 * Polls API routes
 */

import { Router, Request, Response } from 'express';
import { pollsService } from '../services/polls.service';
import { blockchainService } from '../services/blockchain.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

// Validation schemas
const distributionModeSchema = z.object({
  mode: z.enum(['MANUAL_PULL', 'MANUAL_PUSH', 'AUTOMATED']),
});

const displayTitleSchema = z.object({
  displayTitle: z.string().min(1).max(500).nullable(),
  chainId: z.number(),
  pollId: z.string(), // BigInt as string
  creatorAddress: z.string(), // For verification
});

/**
 * GET /api/polls
 * Get all polls with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const chainId = req.query.chainId ? parseInt(req.query.chainId as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const polls = await pollsService.getAll({
      chainId,
      limit,
      offset,
    });

    res.json({
      polls,
      meta: {
        limit,
        offset,
        count: polls.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get polls', { error });
    res.status(500).json({ error: 'Failed to fetch polls' });
  }
});

/**
 * GET /api/polls/:id
 * Get poll details by database ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const poll = await pollsService.getById(id);

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    res.json({ poll });
  } catch (error) {
    logger.error('Failed to get poll', { error });
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

/**
 * GET /api/polls/:id/full
 * Get poll with distribution logs
 */
router.get('/:id/full', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const poll = await pollsService.getWithDistributions(id);

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    res.json({ poll });
  } catch (error) {
    logger.error('Failed to get poll with distributions', { error });
    res.status(500).json({ error: 'Failed to fetch poll details' });
  }
});

/**
 * GET /api/polls/chain/:chainId/:pollId
 * Get poll by chain ID and poll ID
 */
router.get('/chain/:chainId/:pollId', async (req: Request, res: Response) => {
  try {
    const chainId = parseInt(req.params.chainId);
    const pollId = BigInt(req.params.pollId);

    const poll = await pollsService.getByChainAndPollId(chainId, pollId);

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    res.json({ poll });
  } catch (error) {
    logger.error('Failed to get poll by chain and poll ID', { error });
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

/**
 * PUT /api/polls/:id/distribution-mode
 * Update poll distribution mode
 */
router.put('/:id/distribution-mode', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = distributionModeSchema.parse(req.body);

    // Check if poll exists
    const poll = await pollsService.getById(id);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Update distribution mode
    const updated = await pollsService.updateDistributionMode(id, data.mode);

    logger.info('Distribution mode updated', {
      pollId: id,
      mode: data.mode,
    });

    res.json({ poll: updated });
  } catch (error) {
    logger.error('Failed to update distribution mode', { error });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to update distribution mode' });
  }
});

/**
 * GET /api/polls/display-titles
 * Get display titles for multiple polls
 * Query params: chainId, pollIds (comma-separated)
 */
router.get('/display-titles', async (req: Request, res: Response) => {
  try {
    const chainId = parseInt(req.query.chainId as string);
    const pollIdsParam = req.query.pollIds as string;

    if (!chainId || !pollIdsParam) {
      return res.status(400).json({ error: 'chainId and pollIds are required' });
    }

    const pollIds = pollIdsParam.split(',').map(id => BigInt(id.trim()));

    // Fetch all polls for the given chain
    const allPolls = await pollsService.getAll({ chainId, limit: 1000 });

    // Create a map of pollId -> displayTitle
    const displayTitles: Record<string, string | null> = {};
    for (const poll of allPolls) {
      if (pollIds.some(pid => pid === poll.pollId)) {
        displayTitles[poll.pollId.toString()] = poll.displayTitle;
      }
    }

    res.json({ displayTitles });
  } catch (error) {
    logger.error('Failed to get display titles', { error });
    res.status(500).json({ error: 'Failed to fetch display titles' });
  }
});

/**
 * PUT /api/polls/display-title
 * Update poll display title (off-chain override)
 * Requires creator verification via blockchain
 */
router.put('/display-title', async (req: Request, res: Response) => {
  try {
    const data = displayTitleSchema.parse(req.body);
    const { displayTitle, chainId, pollId, creatorAddress } = data;

    // Verify the creator owns this poll by checking on-chain
    const onChainPoll = await blockchainService.getPoll(BigInt(pollId), chainId);

    if (!onChainPoll) {
      return res.status(404).json({ error: 'Poll not found on chain' });
    }

    // Verify creator address matches (case-insensitive)
    if (onChainPoll.creator.toLowerCase() !== creatorAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Only the poll creator can update the title' });
    }

    // Get or create the poll record in our database
    const poll = await pollsService.getOrCreateByChainAndPollId(chainId, BigInt(pollId));

    // Update the display title
    const updated = await pollsService.updateDisplayTitle(poll.id, displayTitle);

    logger.info('Display title updated', {
      pollId,
      chainId,
      displayTitle,
      creator: creatorAddress,
    });

    res.json({ poll: updated });
  } catch (error) {
    logger.error('Failed to update display title', { error });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to update display title' });
  }
});

/**
 * GET /api/polls/:id/distributions
 * Get distribution history for a poll
 */
router.get('/:id/distributions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if poll exists
    const poll = await pollsService.getById(id);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const distributions = await pollsService.getDistributions(id);

    res.json({
      pollId: id,
      distributions,
      count: distributions.length,
    });
  } catch (error) {
    logger.error('Failed to get distributions', { error });
    res.status(500).json({ error: 'Failed to fetch distributions' });
  }
});

/**
 * GET /api/polls/:id/stats
 * Get poll statistics
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if poll exists
    const poll = await pollsService.getById(id);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const stats = await pollsService.getStats(id);

    res.json({
      pollId: id,
      stats,
    });
  } catch (error) {
    logger.error('Failed to get poll stats', { error });
    res.status(500).json({ error: 'Failed to fetch poll statistics' });
  }
});

/**
 * GET /api/polls/blockchain/:chainId/:pollId/fundings
 * Get funding history from blockchain for a specific poll
 */
router.get('/blockchain/:chainId/:pollId/fundings', async (req: Request, res: Response) => {
  try {
    const chainId = parseInt(req.params.chainId);
    const { pollId } = req.params;

    const fundings = await blockchainService.getPollFundings(BigInt(pollId), chainId);
    const poll = await blockchainService.getPoll(BigInt(pollId), chainId);

    res.json({
      pollId,
      chainId,
      totalFunding: poll.totalFunding.toString(),
      distributionMode: poll.distributionMode, // NEW: include distribution mode
      totalFundings: fundings.length,
      fundings: fundings.map((funding) => ({
        token: funding.token,
        amount: funding.amount,
        funder: funding.funder,
        timestamp: funding.timestamp.toString(),
      })),
    });
  } catch (error) {
    logger.error('Failed to get poll fundings from blockchain', { error, pollId: req.params.pollId });
    res.status(500).json({ error: 'Failed to get poll fundings' });
  }
});

export default router;
