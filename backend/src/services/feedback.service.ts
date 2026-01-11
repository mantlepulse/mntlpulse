/**
 * Feedback Service for managing user feedback
 */

import { db } from '../db/client';
import { feedbacks, FeedbackCategory, FeedbackStatus, FeedbackMetadata } from '../db/schema';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';

export interface CreateFeedbackData {
  category: FeedbackCategory;
  content: string;
  walletAddress?: string;
  isAnonymous?: boolean;
  metadata?: FeedbackMetadata;
}

export interface FeedbackFilters {
  status?: FeedbackStatus;
  category?: FeedbackCategory;
  isSnapshotted?: boolean;
  limit?: number;
  offset?: number;
}

export class FeedbackService {
  /**
   * Create new feedback
   */
  async create(data: CreateFeedbackData) {
    const [feedback] = await db
      .insert(feedbacks)
      .values({
        category: data.category,
        content: data.content,
        walletAddress: data.isAnonymous ? null : data.walletAddress,
        isAnonymous: data.isAnonymous ?? true,
        metadata: data.metadata,
        status: 'open',
      })
      .returning();

    return feedback;
  }

  /**
   * Get all feedbacks with optional filters
   */
  async getAll(filters?: FeedbackFilters) {
    let query = db.select().from(feedbacks);

    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(feedbacks.status, filters.status));
    }

    if (filters?.category) {
      conditions.push(eq(feedbacks.category, filters.category));
    }

    if (filters?.isSnapshotted === true) {
      conditions.push(sql`${feedbacks.snapshotTxHash} IS NOT NULL`);
    } else if (filters?.isSnapshotted === false) {
      conditions.push(isNull(feedbacks.snapshotTxHash));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query
      .orderBy(desc(feedbacks.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return results;
  }

  /**
   * Get feedback by ID
   */
  async getById(id: string) {
    const [feedback] = await db
      .select()
      .from(feedbacks)
      .where(eq(feedbacks.id, id))
      .limit(1);

    return feedback || null;
  }

  /**
   * Update feedback status
   */
  async updateStatus(id: string, status: FeedbackStatus) {
    const [updated] = await db
      .update(feedbacks)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(feedbacks.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Get open feedbacks for polling (sorted by creation date)
   */
  async getOpenFeedbacks(limit: number = 10) {
    return db
      .select()
      .from(feedbacks)
      .where(eq(feedbacks.status, 'open'))
      .orderBy(desc(feedbacks.createdAt))
      .limit(limit);
  }

  /**
   * Get feedbacks pending snapshot (not yet on-chain)
   */
  async getUnsnapshotted(limit: number = 100) {
    return db
      .select()
      .from(feedbacks)
      .where(isNull(feedbacks.snapshotTxHash))
      .orderBy(desc(feedbacks.createdAt))
      .limit(limit);
  }

  /**
   * Mark feedbacks as snapshotted after successful on-chain transaction
   */
  async markAsSnapshotted(ids: string[], txHash: string) {
    const now = new Date();

    const updated = await db
      .update(feedbacks)
      .set({
        snapshotTxHash: txHash,
        snapshotedAt: now,
        updatedAt: now,
      })
      .where(sql`${feedbacks.id} IN ${ids}`)
      .returning();

    return updated;
  }

  /**
   * Get feedback statistics
   */
  async getStats() {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        open: sql<number>`count(*) filter (where ${feedbacks.status} = 'open')::int`,
        selected: sql<number>`count(*) filter (where ${feedbacks.status} = 'selected')::int`,
        polled: sql<number>`count(*) filter (where ${feedbacks.status} = 'polled')::int`,
        closed: sql<number>`count(*) filter (where ${feedbacks.status} = 'closed')::int`,
        snapshotted: sql<number>`count(*) filter (where ${feedbacks.snapshotTxHash} IS NOT NULL)::int`,
        pending: sql<number>`count(*) filter (where ${feedbacks.snapshotTxHash} IS NULL)::int`,
      })
      .from(feedbacks);

    return stats;
  }

  /**
   * Delete feedback by ID
   */
  async delete(id: string) {
    const [deleted] = await db
      .delete(feedbacks)
      .where(eq(feedbacks.id, id))
      .returning();

    return deleted || null;
  }
}

export const feedbackService = new FeedbackService();
