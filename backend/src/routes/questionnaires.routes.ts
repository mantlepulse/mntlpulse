/**
 * Questionnaires API Routes
 * Endpoints for managing questionnaires and poll groupings
 */

import { Router, Request, Response } from 'express';
import { questionnairesService } from '../services/questionnaires.service';
import { z } from 'zod';

const router = Router();

/**
 * Helper to serialize BigInt values to strings for JSON response
 */
function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

// Validation schemas
const createQuestionnaireSchema = z.object({
  creatorAddress: z.string().min(1),
  chainId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  totalRewardAmount: z.string().optional(),
  fundingToken: z.string().optional(),
  settings: z.object({
    allowPartialCompletion: z.boolean().optional(),
    showProgressBar: z.boolean().optional(),
    shuffleOrder: z.boolean().optional(),
    requireAllPolls: z.boolean().optional(),
  }).optional(),
});

const updateQuestionnaireSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  totalRewardAmount: z.string().optional(),
  fundingToken: z.string().optional(),
  rewardDistribution: z.array(z.object({
    pollId: z.string(),
    chainId: z.number(),
    percentage: z.number(),
  })).optional(),
  settings: z.object({
    allowPartialCompletion: z.boolean().optional(),
    showProgressBar: z.boolean().optional(),
    shuffleOrder: z.boolean().optional(),
    requireAllPolls: z.boolean().optional(),
  }).optional(),
  status: z.enum(['draft', 'active', 'closed', 'archived']).optional(),
});

const addPollSchema = z.object({
  chainId: z.number().int().positive(),
  pollId: z.number().int().min(0),
  sortOrder: z.number().int().min(0).optional(),
  rewardPercentage: z.string().optional(),
  source: z.enum(['new', 'existing']).optional(),
});

const updatePollOrderSchema = z.object({
  polls: z.array(z.object({
    chainId: z.number().int().positive(),
    pollId: z.number().int().min(0),
    sortOrder: z.number().int().min(0),
  })),
});

const updateRewardDistributionSchema = z.object({
  distribution: z.array(z.object({
    chainId: z.number().int().positive(),
    pollId: z.number().int().min(0),
    percentage: z.string(),
  })),
});

/**
 * POST /api/questionnaires
 * Create a new questionnaire
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validated = createQuestionnaireSchema.parse(req.body);
    const questionnaire = await questionnairesService.createQuestionnaire({
      ...validated,
      startTime: validated.startTime ? new Date(validated.startTime) : undefined,
      endTime: validated.endTime ? new Date(validated.endTime) : undefined,
    });
    res.status(201).json(serializeBigInt(questionnaire));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.issues });
    } else {
      console.error('Error creating questionnaire:', error);
      res.status(500).json({ error: 'Failed to create questionnaire' });
    }
  }
});

/**
 * GET /api/questionnaires
 * Get questionnaires (by creator or all active)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { creatorAddress, chainId, status, limit, offset } = req.query;

    if (creatorAddress && typeof creatorAddress === 'string') {
      // Get by creator
      const validStatuses = ['draft', 'active', 'closed', 'archived'];
      const statusFilter = status && validStatuses.includes(status as string)
        ? (status as 'draft' | 'active' | 'closed' | 'archived')
        : undefined;

      const questionnaires = await questionnairesService.getQuestionnairesByCreator(
        creatorAddress,
        chainId ? parseInt(chainId as string) : undefined,
        statusFilter
      );
      return res.json(serializeBigInt(questionnaires));
    }

    // Get active questionnaires
    const questionnaires = await questionnairesService.getActiveQuestionnaires(
      chainId ? parseInt(chainId as string) : undefined,
      limit ? parseInt(limit as string) : 20,
      offset ? parseInt(offset as string) : 0
    );
    res.json(serializeBigInt(questionnaires));
  } catch (error) {
    console.error('Error fetching questionnaires:', error);
    res.status(500).json({ error: 'Failed to fetch questionnaires' });
  }
});

/**
 * GET /api/questionnaires/polls-in-questionnaires
 * Get all polls that are in questionnaires for a creator
 * NOTE: This route must be defined BEFORE /:id to avoid path conflicts
 */
router.get('/polls-in-questionnaires', async (req: Request, res: Response) => {
  try {
    const { creatorAddress, chainId, excludeQuestionnaireId } = req.query;

    if (!creatorAddress || typeof creatorAddress !== 'string') {
      return res.status(400).json({ error: 'creatorAddress is required' });
    }

    if (!chainId) {
      return res.status(400).json({ error: 'chainId is required' });
    }

    const polls = await questionnairesService.getPollsInQuestionnaires(
      creatorAddress,
      parseInt(chainId as string),
      excludeQuestionnaireId as string | undefined
    );
    res.json(serializeBigInt(polls));
  } catch (error) {
    console.error('Error fetching polls in questionnaires:', error);
    res.status(500).json({ error: 'Failed to fetch polls in questionnaires' });
  }
});

/**
 * GET /api/questionnaires/:id
 * Get a questionnaire by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { includePolls } = req.query;

    let questionnaire;
    if (includePolls === 'true') {
      questionnaire = await questionnairesService.getQuestionnaireWithPolls(id);
    } else {
      questionnaire = await questionnairesService.getQuestionnaireById(id);
    }

    if (!questionnaire) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    res.json(serializeBigInt(questionnaire));
  } catch (error) {
    console.error('Error fetching questionnaire:', error);
    res.status(500).json({ error: 'Failed to fetch questionnaire' });
  }
});

/**
 * GET /api/questionnaires/chain/:chainId/:onChainId
 * Get a questionnaire by on-chain ID
 */
router.get('/chain/:chainId/:onChainId', async (req: Request, res: Response) => {
  try {
    const { chainId, onChainId } = req.params;
    const questionnaire = await questionnairesService.getQuestionnaireByOnChainId(
      parseInt(chainId),
      parseInt(onChainId)
    );

    if (!questionnaire) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    res.json(serializeBigInt(questionnaire));
  } catch (error) {
    console.error('Error fetching questionnaire:', error);
    res.status(500).json({ error: 'Failed to fetch questionnaire' });
  }
});

/**
 * PUT /api/questionnaires/:id
 * Update a questionnaire
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { creatorAddress } = req.query;

    if (!creatorAddress || typeof creatorAddress !== 'string') {
      return res.status(400).json({ error: 'creatorAddress is required' });
    }

    const validated = updateQuestionnaireSchema.parse(req.body);
    const questionnaire = await questionnairesService.updateQuestionnaire(id, creatorAddress, {
      ...validated,
      startTime: validated.startTime ? new Date(validated.startTime) : undefined,
      endTime: validated.endTime ? new Date(validated.endTime) : undefined,
    });

    if (!questionnaire) {
      return res.status(404).json({ error: 'Questionnaire not found or unauthorized' });
    }

    res.json(serializeBigInt(questionnaire));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.issues });
    } else {
      console.error('Error updating questionnaire:', error);
      res.status(500).json({ error: 'Failed to update questionnaire' });
    }
  }
});

/**
 * DELETE /api/questionnaires/:id
 * Archive or delete a questionnaire
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { creatorAddress, permanent } = req.query;

    if (!creatorAddress || typeof creatorAddress !== 'string') {
      return res.status(400).json({ error: 'creatorAddress is required' });
    }

    let success;
    if (permanent === 'true') {
      success = await questionnairesService.deleteQuestionnaire(id, creatorAddress);
    } else {
      success = await questionnairesService.archiveQuestionnaire(id, creatorAddress);
    }

    if (!success) {
      return res.status(404).json({ error: 'Questionnaire not found or unauthorized' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting questionnaire:', error);
    res.status(500).json({ error: 'Failed to delete questionnaire' });
  }
});

/**
 * POST /api/questionnaires/:id/polls
 * Add a poll to a questionnaire
 */
router.post('/:id/polls', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = addPollSchema.parse(req.body);

    const success = await questionnairesService.addPollToQuestionnaire({
      questionnaireId: id,
      ...validated,
    });

    if (!success) {
      return res.status(400).json({ error: 'Poll already exists in questionnaire or questionnaire not found' });
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.issues });
    } else {
      console.error('Error adding poll to questionnaire:', error);
      res.status(500).json({ error: 'Failed to add poll to questionnaire' });
    }
  }
});

/**
 * DELETE /api/questionnaires/:id/polls/:chainId/:pollId
 * Remove a poll from a questionnaire
 */
router.delete('/:id/polls/:chainId/:pollId', async (req: Request, res: Response) => {
  try {
    const { id, chainId, pollId } = req.params;

    const success = await questionnairesService.removePollFromQuestionnaire(
      id,
      parseInt(chainId),
      parseInt(pollId)
    );

    if (!success) {
      return res.status(404).json({ error: 'Poll not found in questionnaire' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing poll from questionnaire:', error);
    res.status(500).json({ error: 'Failed to remove poll from questionnaire' });
  }
});

/**
 * PUT /api/questionnaires/:id/polls/order
 * Update poll order in a questionnaire
 */
router.put('/:id/polls/order', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = updatePollOrderSchema.parse(req.body);

    const success = await questionnairesService.updatePollOrder(id, validated.polls);

    if (!success) {
      return res.status(500).json({ error: 'Failed to update poll order' });
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.issues });
    } else {
      console.error('Error updating poll order:', error);
      res.status(500).json({ error: 'Failed to update poll order' });
    }
  }
});

/**
 * PUT /api/questionnaires/:id/rewards
 * Update reward distribution for polls
 */
router.put('/:id/rewards', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = updateRewardDistributionSchema.parse(req.body);

    const success = await questionnairesService.updateRewardDistribution(id, validated.distribution);

    if (!success) {
      return res.status(500).json({ error: 'Failed to update reward distribution' });
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.issues });
    } else {
      console.error('Error updating reward distribution:', error);
      res.status(500).json({ error: 'Failed to update reward distribution' });
    }
  }
});

/**
 * POST /api/questionnaires/:id/respond
 * Start or continue responding to a questionnaire
 */
router.post('/:id/respond', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userAddress } = req.body;

    if (!userAddress || typeof userAddress !== 'string') {
      return res.status(400).json({ error: 'userAddress is required' });
    }

    const response = await questionnairesService.startQuestionnaireResponse(id, userAddress);
    res.json(serializeBigInt(response));
  } catch (error) {
    console.error('Error starting questionnaire response:', error);
    res.status(500).json({ error: 'Failed to start questionnaire response' });
  }
});

/**
 * PUT /api/questionnaires/:id/respond
 * Update progress on a questionnaire (record answering a poll)
 */
router.put('/:id/respond', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userAddress, pollId } = req.body;

    if (!userAddress || typeof userAddress !== 'string') {
      return res.status(400).json({ error: 'userAddress is required' });
    }

    if (!pollId || typeof pollId !== 'string') {
      return res.status(400).json({ error: 'pollId is required' });
    }

    const response = await questionnairesService.updateQuestionnaireProgress(id, userAddress, pollId);

    if (!response) {
      return res.status(404).json({ error: 'Response not found. Start the questionnaire first.' });
    }

    res.json(serializeBigInt(response));
  } catch (error) {
    console.error('Error updating questionnaire progress:', error);
    res.status(500).json({ error: 'Failed to update questionnaire progress' });
  }
});

/**
 * GET /api/questionnaires/:id/progress/:userAddress
 * Get user's progress on a questionnaire
 */
router.get('/:id/progress/:userAddress', async (req: Request, res: Response) => {
  try {
    const { id, userAddress } = req.params;
    const progress = await questionnairesService.getUserProgress(id, userAddress);

    if (!progress) {
      return res.json({ started: false, pollsAnswered: [], isComplete: false });
    }

    res.json(serializeBigInt({
      started: true,
      ...progress,
    }));
  } catch (error) {
    console.error('Error fetching questionnaire progress:', error);
    res.status(500).json({ error: 'Failed to fetch questionnaire progress' });
  }
});

/**
 * GET /api/questionnaires/user/:userAddress
 * Get all questionnaire responses for a user
 */
router.get('/user/:userAddress', async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;
    const responses = await questionnairesService.getUserResponses(userAddress);
    res.json(serializeBigInt(responses));
  } catch (error) {
    console.error('Error fetching user questionnaire responses:', error);
    res.status(500).json({ error: 'Failed to fetch user responses' });
  }
});

export default router;
