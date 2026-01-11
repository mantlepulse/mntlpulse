/**
 * Feedback API Client
 */

import { apiClient } from './client';

export type FeedbackCategory = 'feature_request' | 'bug_report' | 'ui_ux' | 'general';
export type FeedbackStatus = 'open' | 'selected' | 'polled' | 'closed';

export interface FeedbackMetadata {
  browser?: string;
  page?: string;
  userAgent?: string;
  referrer?: string;
}

export interface Feedback {
  id: string;
  category: FeedbackCategory;
  content: string;
  walletAddress: string | null;
  isAnonymous: boolean;
  status: FeedbackStatus;
  metadata: FeedbackMetadata | null;
  snapshotTxHash: string | null;
  snapshotedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

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

/**
 * Submit new feedback
 */
export async function submitFeedback(data: CreateFeedbackData): Promise<Feedback> {
  const response = await apiClient.post<{ feedback: Feedback }>('/api/feedback', data);
  return response.data.feedback;
}

/**
 * Get feedbacks with optional filters
 */
export async function getFeedbacks(filters?: FeedbackFilters): Promise<{
  feedbacks: Feedback[];
  meta: { limit: number; offset: number; count: number };
}> {
  const params = new URLSearchParams();

  if (filters?.status) params.append('status', filters.status);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.isSnapshotted !== undefined) params.append('isSnapshotted', String(filters.isSnapshotted));
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.offset) params.append('offset', String(filters.offset));

  const response = await apiClient.get(`/api/feedback?${params.toString()}`);
  return response.data;
}

/**
 * Get feedback statistics
 */
export async function getFeedbackStats(): Promise<{
  total: number;
  open: number;
  selected: number;
  polled: number;
  closed: number;
  snapshotted: number;
  pending: number;
}> {
  const response = await apiClient.get('/api/feedback/stats');
  return response.data.stats;
}

/**
 * Get a single feedback by ID
 */
export async function getFeedbackById(id: string): Promise<Feedback> {
  const response = await apiClient.get<{ feedback: Feedback }>(`/api/feedback/${id}`);
  return response.data.feedback;
}

/**
 * Get feedbacks pending snapshot
 */
export async function getPendingSnapshots(limit?: number): Promise<{
  feedbacks: Feedback[];
  count: number;
}> {
  const params = limit ? `?limit=${limit}` : '';
  const response = await apiClient.get(`/api/feedback/snapshot/pending${params}`);
  return response.data;
}

/**
 * Mark feedbacks as snapshotted after successful on-chain transaction
 */
export async function markFeedbacksSnapshotted(
  feedbackIds: string[],
  txHash: string
): Promise<{ success: boolean; updated: number; txHash: string }> {
  const response = await apiClient.post('/api/feedback/snapshot/complete', {
    feedbackIds,
    txHash,
  });
  return response.data;
}
