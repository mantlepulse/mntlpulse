/**
 * Announcements API Client
 */

import { apiClient } from './client';

export interface Announcement {
  id: string;
  title: string;
  description: string;
  link?: string | null;
  linkText?: string | null;
  status: 'draft' | 'published' | 'archived';
  startDate?: string | null;
  endDate?: string | null;
  dismissible: boolean;
  priority: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementData {
  title: string;
  description: string;
  link?: string;
  linkText?: string;
  status?: 'draft' | 'published' | 'archived';
  startDate?: string;
  endDate?: string;
  dismissible?: boolean;
  priority?: number;
  createdBy: string;
}

export interface UpdateAnnouncementData {
  title?: string;
  description?: string;
  link?: string;
  linkText?: string;
  status?: 'draft' | 'published' | 'archived';
  startDate?: string;
  endDate?: string;
  dismissible?: boolean;
  priority?: number;
}

/**
 * Get all published announcements (public)
 */
export async function getPublishedAnnouncements(): Promise<Announcement[]> {
  const response = await apiClient.get('/announcements');
  return response.data.announcements;
}

/**
 * Get active announcement
 */
export async function getActiveAnnouncement(): Promise<Announcement | null> {
  const response = await apiClient.get('/announcements/active');
  return response.data.announcement;
}

/**
 * Get all announcements including drafts (admin only)
 */
export async function getAllAnnouncements(adminAddress: string): Promise<Announcement[]> {
  const response = await apiClient.get('/announcements/all', {
    params: { adminAddress },
  });
  return response.data.announcements;
}

/**
 * Get announcement by ID
 */
export async function getAnnouncement(id: string): Promise<Announcement> {
  const response = await apiClient.get(`/announcements/${id}`);
  return response.data.announcement;
}

/**
 * Create announcement (admin only)
 */
export async function createAnnouncement(
  data: CreateAnnouncementData
): Promise<Announcement> {
  const response = await apiClient.post('/announcements', data);
  return response.data.announcement;
}

/**
 * Update announcement (admin only)
 */
export async function updateAnnouncement(
  id: string,
  data: UpdateAnnouncementData,
  adminAddress: string
): Promise<Announcement> {
  const response = await apiClient.put(`/announcements/${id}`, data, {
    params: { adminAddress },
  });
  return response.data.announcement;
}

/**
 * Delete announcement (admin only)
 */
export async function deleteAnnouncement(
  id: string,
  adminAddress: string
): Promise<void> {
  await apiClient.delete(`/announcements/${id}`, {
    params: { adminAddress },
  });
}

/**
 * Publish announcement (admin only)
 */
export async function publishAnnouncement(
  id: string,
  adminAddress: string
): Promise<Announcement> {
  const response = await apiClient.post(`/announcements/${id}/publish`, null, {
    params: { adminAddress },
  });
  return response.data.announcement;
}

/**
 * Archive announcement (admin only)
 */
export async function archiveAnnouncement(
  id: string,
  adminAddress: string
): Promise<Announcement> {
  const response = await apiClient.post(`/announcements/${id}/archive`, null, {
    params: { adminAddress },
  });
  return response.data.announcement;
}

/**
 * Announcements API namespace
 */
export const announcementsAPI = {
  getPublished: getPublishedAnnouncements,
  getActive: getActiveAnnouncement,
  getAll: getAllAnnouncements,
  getById: getAnnouncement,
  create: createAnnouncement,
  update: updateAnnouncement,
  delete: deleteAnnouncement,
  publish: publishAnnouncement,
  archive: archiveAnnouncement,
};
