/**
 * Projects API Routes
 * Endpoints for managing projects and poll groupings
 */

import { Router, Request, Response } from 'express';
import { projectsService } from '../services/projects.service';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createProjectSchema = z.object({
  creatorAddress: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  settings: z.object({
    showVoteBreakdown: z.boolean().optional(),
    showTrends: z.boolean().optional(),
    showParticipantInsights: z.boolean().optional(),
    customLabels: z.record(z.string(), z.string()).optional(),
  }).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  settings: z.object({
    showVoteBreakdown: z.boolean().optional(),
    showTrends: z.boolean().optional(),
    showParticipantInsights: z.boolean().optional(),
    customLabels: z.record(z.string(), z.string()).optional(),
  }).optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
});

const addPollSchema = z.object({
  chainId: z.number().int().positive(),
  pollId: z.string().min(1),
  sortOrder: z.number().int().min(0).optional(),
});

const updatePollOrderSchema = z.object({
  polls: z.array(z.object({
    chainId: z.number().int().positive(),
    pollId: z.string().min(1),
    sortOrder: z.number().int().min(0),
  })),
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validated = createProjectSchema.parse(req.body);
    const project = await projectsService.createProject(validated);
    res.status(201).json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.issues });
    } else {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
});

/**
 * GET /api/projects
 * Get all projects for a creator
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { creatorAddress, status } = req.query;

    if (!creatorAddress || typeof creatorAddress !== 'string') {
      return res.status(400).json({ error: 'creatorAddress is required' });
    }

    const validStatuses = ['active', 'completed', 'archived'];
    const statusFilter = status && validStatuses.includes(status as string)
      ? (status as 'active' | 'completed' | 'archived')
      : undefined;

    const projects = await projectsService.getProjectsByCreator(creatorAddress, statusFilter);
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * GET /api/projects/stats
 * Get project summary stats for creator dashboard
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { creatorAddress } = req.query;

    if (!creatorAddress || typeof creatorAddress !== 'string') {
      return res.status(400).json({ error: 'creatorAddress is required' });
    }

    const stats = await projectsService.getCreatorProjectStats(creatorAddress);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching project stats:', error);
    res.status(500).json({ error: 'Failed to fetch project stats' });
  }
});

/**
 * GET /api/projects/:id
 * Get a project by ID with its polls
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { includePolls } = req.query;

    let project;
    if (includePolls === 'true') {
      project = await projectsService.getProjectWithPolls(id);
    } else {
      project = await projectsService.getProjectById(id);
    }

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

/**
 * PUT /api/projects/:id
 * Update a project
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { creatorAddress } = req.query;

    if (!creatorAddress || typeof creatorAddress !== 'string') {
      return res.status(400).json({ error: 'creatorAddress is required' });
    }

    const validated = updateProjectSchema.parse(req.body);
    const project = await projectsService.updateProject(id, creatorAddress, validated);

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    res.json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.issues });
    } else {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }
});

/**
 * DELETE /api/projects/:id
 * Archive a project (soft delete)
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
      success = await projectsService.deleteProject(id, creatorAddress);
    } else {
      success = await projectsService.archiveProject(id, creatorAddress);
    }

    if (!success) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

/**
 * POST /api/projects/:id/polls
 * Add a poll to a project
 */
router.post('/:id/polls', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = addPollSchema.parse(req.body);

    const success = await projectsService.addPollToProject({
      projectId: id,
      ...validated,
    });

    if (!success) {
      return res.status(400).json({ error: 'Poll already exists in project or project not found' });
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.issues });
    } else {
      console.error('Error adding poll to project:', error);
      res.status(500).json({ error: 'Failed to add poll to project' });
    }
  }
});

/**
 * DELETE /api/projects/:id/polls/:chainId/:pollId
 * Remove a poll from a project
 */
router.delete('/:id/polls/:chainId/:pollId', async (req: Request, res: Response) => {
  try {
    const { id, chainId, pollId } = req.params;

    const success = await projectsService.removePollFromProject(
      id,
      parseInt(chainId),
      pollId
    );

    if (!success) {
      return res.status(404).json({ error: 'Poll not found in project' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing poll from project:', error);
    res.status(500).json({ error: 'Failed to remove poll from project' });
  }
});

/**
 * GET /api/projects/:id/polls
 * Get all polls in a project
 */
router.get('/:id/polls', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const polls = await projectsService.getProjectPolls(id);
    res.json(polls);
  } catch (error) {
    console.error('Error fetching project polls:', error);
    res.status(500).json({ error: 'Failed to fetch project polls' });
  }
});

/**
 * PUT /api/projects/:id/polls/order
 * Update poll order in a project
 */
router.put('/:id/polls/order', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = updatePollOrderSchema.parse(req.body);

    const success = await projectsService.updatePollOrder(id, validated.polls);

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
 * GET /api/projects/:id/insights
 * Get insights for a project
 */
router.get('/:id/insights', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    const insights = await projectsService.getInsights(
      id,
      type ? String(type) : undefined
    );

    res.json(insights);
  } catch (error) {
    console.error('Error fetching project insights:', error);
    res.status(500).json({ error: 'Failed to fetch project insights' });
  }
});

/**
 * GET /api/projects/by-poll/:chainId/:pollId
 * Get projects containing a specific poll
 */
router.get('/by-poll/:chainId/:pollId', async (req: Request, res: Response) => {
  try {
    const { chainId, pollId } = req.params;
    const projects = await projectsService.getProjectsContainingPoll(
      parseInt(chainId),
      pollId
    );
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects by poll:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

export default router;
