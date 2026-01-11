/**
 * React hooks for feedback management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFeedbacks,
  getFeedbackStats,
  getPendingSnapshots,
  FeedbackFilters,
  Feedback,
} from '@/lib/api/feedback-client';
import { apiClient } from '@/lib/api/client';

/**
 * Hook to fetch feedbacks with optional filters
 */
export function useFeedbacks(filters?: FeedbackFilters) {
  return useQuery({
    queryKey: ['feedbacks', filters],
    queryFn: () => getFeedbacks(filters),
  });
}

/**
 * Hook to fetch feedback statistics
 */
export function useFeedbackStats() {
  return useQuery({
    queryKey: ['feedback-stats'],
    queryFn: getFeedbackStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Hook to fetch feedbacks pending snapshot
 */
export function usePendingSnapshots(limit?: number) {
  return useQuery({
    queryKey: ['pending-snapshots', limit],
    queryFn: () => getPendingSnapshots(limit),
  });
}

/**
 * Hook to update feedback status
 */
export function useUpdateFeedbackStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiClient.put(`/api/feedback/${id}/status`, { status });
      return response.data.feedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['feedback-stats'] });
    },
  });
}

/**
 * Hook to delete feedback
 */
export function useDeleteFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/feedback/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['feedback-stats'] });
      queryClient.invalidateQueries({ queryKey: ['pending-snapshots'] });
    },
  });
}

/**
 * Hook to mark feedbacks as snapshotted
 */
export function useMarkSnapshotted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ feedbackIds, txHash }: { feedbackIds: string[]; txHash: string }) => {
      const response = await apiClient.post('/api/feedback/snapshot/complete', {
        feedbackIds,
        txHash,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['feedback-stats'] });
      queryClient.invalidateQueries({ queryKey: ['pending-snapshots'] });
    },
  });
}
