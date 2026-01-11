/**
 * Feedback API routes
 */

import { Router, Request, Response } from 'express';
import { feedbackService } from '../services/feedback.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

// Validation schemas
const feedbackCategorySchema = z.enum(['feature_request', 'bug_report', 'ui_ux', 'general']);
const feedbackStatusSchema = z.enum(['open', 'selected', 'polled', 'closed']);

const createFeedbackSchema = z.object({
  category: feedbackCategorySchema,
  content: z.string().min(10).max(5000),
  walletAddress: z.string().optional(),
  isAnonymous: z.boolean().optional().default(true),
  metadata: z.object({
    browser: z.string().optional(),
    page: z.string().optional(),
    userAgent: z.string().optional(),
    referrer: z.string().optional(),
  }).optional(),
});

const updateStatusSchema = z.object({
  status: feedbackStatusSchema,
});

const markSnapshottedSchema = z.object({
  feedbackIds: z.array(z.string().uuid()),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

/**
 * POST /api/feedback
 * Submit new feedback
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createFeedbackSchema.parse(req.body);

    const feedback = await feedbackService.create(data);

    logger.info('Feedback created', {
      id: feedback.id,
      category: feedback.category,
      isAnonymous: feedback.isAnonymous,
    });

    res.status(201).json({ feedback });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    logger.error('Failed to create feedback', { error });
    res.status(500).json({ error: 'Failed to create feedback' });
  }
});

/**
 * GET /api/feedback
 * Get all feedbacks with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const category = req.query.category as string | undefined;
    const isSnapshotted = req.query.isSnapshotted === 'true' ? true : req.query.isSnapshotted === 'false' ? false : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    // Validate status and category if provided
    const validatedStatus = status ? feedbackStatusSchema.parse(status) : undefined;
    const validatedCategory = category ? feedbackCategorySchema.parse(category) : undefined;

    const feedbacks = await feedbackService.getAll({
      status: validatedStatus,
      category: validatedCategory,
      isSnapshotted,
      limit,
      offset,
    });

    res.json({
      feedbacks,
      meta: {
        limit,
        offset,
        count: feedbacks.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.issues });
    }
    logger.error('Failed to get feedbacks', { error });
    res.status(500).json({ error: 'Failed to fetch feedbacks' });
  }
});

/**
 * GET /api/feedback/stats
 * Get feedback statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await feedbackService.getStats();
    res.json({ stats });
  } catch (error) {
    logger.error('Failed to get feedback stats', { error });
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/feedback/snapshot/pending
 * Get feedbacks pending snapshot (not yet on-chain)
 */
router.get('/snapshot/pending', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const feedbacks = await feedbackService.getUnsnapshotted(limit);

    res.json({
      feedbacks,
      count: feedbacks.length,
    });
  } catch (error) {
    logger.error('Failed to get pending snapshots', { error });
    res.status(500).json({ error: 'Failed to fetch pending snapshots' });
  }
});

/**
 * POST /api/feedback/snapshot/complete
 * Mark feedbacks as snapshotted after successful on-chain transaction
 */
router.post('/snapshot/complete', async (req: Request, res: Response) => {
  try {
    const data = markSnapshottedSchema.parse(req.body);

    const updated = await feedbackService.markAsSnapshotted(data.feedbackIds, data.txHash);

    logger.info('Feedbacks marked as snapshotted', {
      count: updated.length,
      txHash: data.txHash,
    });

    res.json({
      success: true,
      updated: updated.length,
      txHash: data.txHash,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    logger.error('Failed to mark feedbacks as snapshotted', { error });
    res.status(500).json({ error: 'Failed to mark feedbacks as snapshotted' });
  }
});

/**
 * GET /api/feedback/:id
 * Get feedback by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const feedback = await feedbackService.getById(id);

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ feedback });
  } catch (error) {
    logger.error('Failed to get feedback', { error });
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

/**
 * PUT /api/feedback/:id/status
 * Update feedback status (admin only)
 */
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateStatusSchema.parse(req.body);

    // Check if feedback exists
    const existing = await feedbackService.getById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    const updated = await feedbackService.updateStatus(id, data.status);

    logger.info('Feedback status updated', {
      id,
      oldStatus: existing.status,
      newStatus: data.status,
    });

    res.json({ feedback: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    logger.error('Failed to update feedback status', { error });
    res.status(500).json({ error: 'Failed to update feedback status' });
  }
});

/**
 * DELETE /api/feedback/:id
 * Delete feedback (admin only)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await feedbackService.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    logger.info('Feedback deleted', { id });

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete feedback', { error });
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

export default router;
