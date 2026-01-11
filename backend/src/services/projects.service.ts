/**
 * Projects Service
 * Manages projects for grouping polls and generating insights
 */

import { db } from '../db/client';
import {
  projects,
  projectPolls,
  projectInsights,
  ProjectStatus,
  ProjectSettings,
  Project,
  NewProject,
} from '../db/schema';
import { eq, and, desc, asc, sql, count, inArray } from 'drizzle-orm';

export interface CreateProjectInput {
  creatorAddress: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  settings?: ProjectSettings;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  settings?: ProjectSettings;
  status?: ProjectStatus;
}

export interface AddPollToProjectInput {
  projectId: string;
  chainId: number;
  pollId: string;
  sortOrder?: number;
}

export interface ProjectWithPolls extends Project {
  polls: Array<{
    chainId: number;
    pollId: string;
    sortOrder: number;
    addedAt: Date;
  }>;
}

export class ProjectsService {
  /**
   * Create a new project
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values({
        creatorAddress: input.creatorAddress.toLowerCase(),
        name: input.name,
        description: input.description,
        category: input.category,
        tags: input.tags,
        settings: input.settings,
        status: 'active',
        pollCount: 0,
        totalVotes: 0,
        totalFunding: '0',
      })
      .returning();
    return project;
  }

  /**
   * Get project by ID
   */
  async getProjectById(id: string): Promise<Project | null> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    return project || null;
  }

  /**
   * Get project with its polls
   */
  async getProjectWithPolls(id: string): Promise<ProjectWithPolls | null> {
    const project = await this.getProjectById(id);
    if (!project) return null;

    const polls = await db
      .select({
        chainId: projectPolls.chainId,
        pollId: projectPolls.pollId,
        sortOrder: projectPolls.sortOrder,
        addedAt: projectPolls.addedAt,
      })
      .from(projectPolls)
      .where(eq(projectPolls.projectId, id))
      .orderBy(asc(projectPolls.sortOrder), asc(projectPolls.addedAt));

    return {
      ...project,
      polls,
    };
  }

  /**
   * Get all projects by a creator
   */
  async getProjectsByCreator(creatorAddress: string, status?: ProjectStatus): Promise<Project[]> {
    const conditions = [eq(projects.creatorAddress, creatorAddress.toLowerCase())];

    if (status) {
      conditions.push(eq(projects.status, status));
    }

    return db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt));
  }

  /**
   * Update a project
   */
  async updateProject(id: string, creatorAddress: string, input: UpdateProjectInput): Promise<Project | null> {
    const [updated] = await db
      .update(projects)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projects.id, id),
          eq(projects.creatorAddress, creatorAddress.toLowerCase())
        )
      )
      .returning();
    return updated || null;
  }

  /**
   * Delete a project (soft delete by archiving)
   */
  async archiveProject(id: string, creatorAddress: string): Promise<boolean> {
    const result = await db
      .update(projects)
      .set({
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projects.id, id),
          eq(projects.creatorAddress, creatorAddress.toLowerCase())
        )
      )
      .returning();
    return result.length > 0;
  }

  /**
   * Permanently delete a project
   */
  async deleteProject(id: string, creatorAddress: string): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(
        and(
          eq(projects.id, id),
          eq(projects.creatorAddress, creatorAddress.toLowerCase())
        )
      )
      .returning();
    return result.length > 0;
  }

  /**
   * Add a poll to a project
   */
  async addPollToProject(input: AddPollToProjectInput): Promise<boolean> {
    try {
      // Check if poll already exists in project
      const existing = await db
        .select()
        .from(projectPolls)
        .where(
          and(
            eq(projectPolls.projectId, input.projectId),
            eq(projectPolls.chainId, input.chainId),
            eq(projectPolls.pollId, input.pollId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return false; // Already exists
      }

      // Add poll to project
      await db.insert(projectPolls).values({
        projectId: input.projectId,
        chainId: input.chainId,
        pollId: input.pollId,
        sortOrder: input.sortOrder ?? 0,
      });

      // Update poll count
      await this.updateProjectStats(input.projectId);

      return true;
    } catch (error) {
      console.error('Error adding poll to project:', error);
      return false;
    }
  }

  /**
   * Remove a poll from a project
   */
  async removePollFromProject(projectId: string, chainId: number, pollId: string): Promise<boolean> {
    const result = await db
      .delete(projectPolls)
      .where(
        and(
          eq(projectPolls.projectId, projectId),
          eq(projectPolls.chainId, chainId),
          eq(projectPolls.pollId, pollId)
        )
      )
      .returning();

    if (result.length > 0) {
      await this.updateProjectStats(projectId);
    }

    return result.length > 0;
  }

  /**
   * Get polls in a project
   */
  async getProjectPolls(projectId: string): Promise<Array<{ chainId: number; pollId: string; sortOrder: number; addedAt: Date }>> {
    return db
      .select({
        chainId: projectPolls.chainId,
        pollId: projectPolls.pollId,
        sortOrder: projectPolls.sortOrder,
        addedAt: projectPolls.addedAt,
      })
      .from(projectPolls)
      .where(eq(projectPolls.projectId, projectId))
      .orderBy(asc(projectPolls.sortOrder), asc(projectPolls.addedAt));
  }

  /**
   * Update poll order in a project
   */
  async updatePollOrder(projectId: string, pollOrders: Array<{ chainId: number; pollId: string; sortOrder: number }>): Promise<boolean> {
    try {
      for (const order of pollOrders) {
        await db
          .update(projectPolls)
          .set({ sortOrder: order.sortOrder })
          .where(
            and(
              eq(projectPolls.projectId, projectId),
              eq(projectPolls.chainId, order.chainId),
              eq(projectPolls.pollId, order.pollId)
            )
          );
      }
      return true;
    } catch (error) {
      console.error('Error updating poll order:', error);
      return false;
    }
  }

  /**
   * Update project stats (poll count, total votes, etc.)
   * This should be called when polls are added/removed or when refreshing stats
   */
  async updateProjectStats(projectId: string): Promise<void> {
    // Count polls in project
    const [pollCountResult] = await db
      .select({ count: count() })
      .from(projectPolls)
      .where(eq(projectPolls.projectId, projectId));

    await db
      .update(projects)
      .set({
        pollCount: pollCountResult?.count ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));
  }

  /**
   * Get projects containing a specific poll
   */
  async getProjectsContainingPoll(chainId: number, pollId: string): Promise<Project[]> {
    const projectIds = await db
      .select({ projectId: projectPolls.projectId })
      .from(projectPolls)
      .where(
        and(
          eq(projectPolls.chainId, chainId),
          eq(projectPolls.pollId, pollId)
        )
      );

    if (projectIds.length === 0) return [];

    return db
      .select()
      .from(projects)
      .where(inArray(projects.id, projectIds.map(p => p.projectId)));
  }

  /**
   * Store a project insight
   */
  async storeInsight(
    projectId: string,
    insightType: string,
    data: Record<string, any>,
    validUntil?: Date
  ): Promise<void> {
    // Delete existing insight of same type
    await db
      .delete(projectInsights)
      .where(
        and(
          eq(projectInsights.projectId, projectId),
          eq(projectInsights.insightType, insightType)
        )
      );

    // Insert new insight
    await db.insert(projectInsights).values({
      projectId,
      insightType,
      data,
      validUntil,
    });
  }

  /**
   * Get project insights
   */
  async getInsights(projectId: string, insightType?: string): Promise<Array<{ insightType: string; data: any; generatedAt: Date }>> {
    const conditions = [eq(projectInsights.projectId, projectId)];

    if (insightType) {
      conditions.push(eq(projectInsights.insightType, insightType));
    }

    return db
      .select({
        insightType: projectInsights.insightType,
        data: projectInsights.data,
        generatedAt: projectInsights.generatedAt,
      })
      .from(projectInsights)
      .where(and(...conditions))
      .orderBy(desc(projectInsights.generatedAt));
  }

  /**
   * Get project summary stats for creator dashboard
   */
  async getCreatorProjectStats(creatorAddress: string): Promise<{
    totalProjects: number;
    activeProjects: number;
    totalPollsInProjects: number;
  }> {
    const normalizedAddress = creatorAddress.toLowerCase();

    const [totalResult] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.creatorAddress, normalizedAddress));

    const [activeResult] = await db
      .select({ count: count() })
      .from(projects)
      .where(
        and(
          eq(projects.creatorAddress, normalizedAddress),
          eq(projects.status, 'active')
        )
      );

    const [pollsResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${projects.pollCount}), 0)` })
      .from(projects)
      .where(eq(projects.creatorAddress, normalizedAddress));

    return {
      totalProjects: totalResult?.count ?? 0,
      activeProjects: activeResult?.count ?? 0,
      totalPollsInProjects: Number(pollsResult?.total) || 0,
    };
  }
}

export const projectsService = new ProjectsService();
