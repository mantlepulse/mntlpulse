/**
 * Announcements API routes
 */

import { Router, Request, Response } from 'express';
import { announcementsService, AnnouncementData } from '../services/announcements.service';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { Address } from 'viem';

const router = Router();

// Validation schemas
const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  link: z.string().url().optional(),
  linkText: z.string().max(50).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  dismissible: z.boolean().optional(),
  priority: z.number().int().min(1).max(10).optional(),
  createdBy: z.string(), // Wallet address
});

const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  link: z.string().url().optional(),
  linkText: z.string().max(50).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  dismissible: z.boolean().optional(),
  priority: z.number().int().min(1).max(10).optional(),
});

/**
 * Simple admin check - can be enhanced with signature verification
 * For now, just checks if address matches environment variable
 */
function isAdmin(address: string): boolean {
  const adminAddresses = process.env.ADMIN_ADDRESSES?.split(',').map(a => a.toLowerCase()) || [];
  return adminAddresses.includes(address.toLowerCase());
}

/**
 * GET /api/announcements
 * Get all published announcements (public endpoint)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const announcements = await announcementsService.getPublished();

    res.json({
      announcements,
      count: announcements.length,
    });
  } catch (error) {
    logger.error('Failed to get announcements', { error });
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

/**
 * GET /api/announcements/active
 * Get the active announcement (highest priority)
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const announcement = await announcementsService.getActive();

    if (!announcement) {
      return res.json({ announcement: null });
    }

    res.json({ announcement });
  } catch (error) {
    logger.error('Failed to get active announcement', { error });
    res.status(500).json({ error: 'Failed to fetch active announcement' });
  }
});

/**
 * GET /api/announcements/all
 * Get all announcements including drafts (admin only)
 */
router.get('/all', async (req: Request, res: Response) => {
  try {
    const adminAddress = req.query.adminAddress as string;

    if (!adminAddress || !isAdmin(adminAddress)) {
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }

    const announcements = await announcementsService.getAll();

    res.json({
      announcements,
      count: announcements.length,
    });
  } catch (error) {
    logger.error('Failed to get all announcements', { error });
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

/**
 * GET /api/announcements/:id
 * Get announcement by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const announcement = await announcementsService.getById(id);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({ announcement });
  } catch (error) {
    logger.error('Failed to get announcement', { error });
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

/**
 * POST /api/announcements
 * Create new announcement (admin only)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createAnnouncementSchema.parse(req.body);

    if (!isAdmin(data.createdBy)) {
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }

    const announcementData: AnnouncementData = {
      ...data,
      createdBy: data.createdBy as Address,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    };

    const announcement = await announcementsService.create(announcementData);

    logger.info('Announcement created', {
      id: announcement.id,
      title: announcement.title,
      createdBy: data.createdBy,
    });

    res.status(201).json({ announcement });
  } catch (error) {
    logger.error('Failed to create announcement', { error });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

/**
 * PUT /api/announcements/:id
 * Update announcement (admin only)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminAddress = req.query.adminAddress as string;

    if (!adminAddress || !isAdmin(adminAddress)) {
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }

    const data = updateAnnouncementSchema.parse(req.body);

    // Check if announcement exists
    const existing = await announcementsService.getById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const updateData = {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    };

    const announcement = await announcementsService.update(id, updateData);

    logger.info('Announcement updated', {
      id,
      updatedBy: adminAddress,
    });

    res.json({ announcement });
  } catch (error) {
    logger.error('Failed to update announcement', { error });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

/**
 * DELETE /api/announcements/:id
 * Delete announcement (admin only)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminAddress = req.query.adminAddress as string;

    if (!adminAddress || !isAdmin(adminAddress)) {
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }

    // Check if announcement exists
    const existing = await announcementsService.getById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    await announcementsService.delete(id);

    logger.info('Announcement deleted', {
      id,
      deletedBy: adminAddress,
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete announcement', { error });
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

/**
 * POST /api/announcements/:id/publish
 * Publish announcement (admin only)
 */
router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminAddress = req.query.adminAddress as string;

    if (!adminAddress || !isAdmin(adminAddress)) {
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }

    const announcement = await announcementsService.publish(id);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    logger.info('Announcement published', {
      id,
      publishedBy: adminAddress,
    });

    res.json({ announcement });
  } catch (error) {
    logger.error('Failed to publish announcement', { error });
    res.status(500).json({ error: 'Failed to publish announcement' });
  }
});

/**
 * POST /api/announcements/:id/archive
 * Archive announcement (admin only)
 */
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminAddress = req.query.adminAddress as string;

    if (!adminAddress || !isAdmin(adminAddress)) {
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }

    const announcement = await announcementsService.archive(id);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    logger.info('Announcement archived', {
      id,
      archivedBy: adminAddress,
    });

    res.json({ announcement });
  } catch (error) {
    logger.error('Failed to archive announcement', { error });
    res.status(500).json({ error: 'Failed to archive announcement' });
  }
});

export default router;
