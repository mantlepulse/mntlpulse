/**
 * Announcements Service
 * Manages site-wide announcements
 */

import { db } from '../db/client';
import { announcements } from '../db/schema';
import { eq, and, lte, gte, or, isNull, desc } from 'drizzle-orm';
import { Address } from 'viem';

export interface AnnouncementData {
  title: string;
  description: string;
  link?: string;
  linkText?: string;
  status?: 'draft' | 'published' | 'archived';
  startDate?: Date;
  endDate?: Date;
  dismissible?: boolean;
  priority?: number;
  createdBy: Address;
}

export class AnnouncementsService {
  /**
   * Get all published announcements (public)
   * Only returns announcements that are:
   * - Published status
   * - Within date range (if dates are set)
   */
  async getPublished() {
    const now = new Date();

    const results = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.status, 'published'),
          // Start date is null OR start date is in the past
          or(
            isNull(announcements.startDate),
            lte(announcements.startDate, now)
          ),
          // End date is null OR end date is in the future
          or(
            isNull(announcements.endDate),
            gte(announcements.endDate, now)
          )
        )
      )
      .orderBy(desc(announcements.priority), desc(announcements.createdAt));

    return results;
  }

  /**
   * Get all announcements (admin only)
   */
  async getAll() {
    return db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt));
  }

  /**
   * Get announcement by ID
   */
  async getById(id: string) {
    const [announcement] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);

    return announcement || null;
  }

  /**
   * Create new announcement
   */
  async create(data: AnnouncementData) {
    const [announcement] = await db
      .insert(announcements)
      .values({
        title: data.title,
        description: data.description,
        link: data.link,
        linkText: data.linkText || 'Learn More',
        status: data.status || 'draft',
        startDate: data.startDate,
        endDate: data.endDate,
        dismissible: data.dismissible ?? true,
        priority: data.priority || 1,
        createdBy: data.createdBy.toLowerCase(),
      })
      .returning();

    return announcement;
  }

  /**
   * Update announcement
   */
  async update(
    id: string,
    data: Partial<AnnouncementData>
  ) {
    const [updated] = await db
      .update(announcements)
      .set({
        ...data,
        ...(data.createdBy ? { createdBy: data.createdBy.toLowerCase() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(announcements.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete announcement
   */
  async delete(id: string) {
    const [deleted] = await db
      .delete(announcements)
      .where(eq(announcements.id, id))
      .returning();

    return deleted;
  }

  /**
   * Publish announcement
   */
  async publish(id: string) {
    return this.update(id, { status: 'published' });
  }

  /**
   * Archive announcement
   */
  async archive(id: string) {
    return this.update(id, { status: 'archived' });
  }

  /**
   * Get active announcement (highest priority published)
   */
  async getActive() {
    const published = await this.getPublished();
    return published.length > 0 ? published[0] : null;
  }
}

// Export singleton instance
export const announcementsService = new AnnouncementsService();
