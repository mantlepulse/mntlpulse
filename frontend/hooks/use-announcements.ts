/**
 * Announcements Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import {
  announcementsAPI,
  Announcement,
  CreateAnnouncementData,
  UpdateAnnouncementData,
} from '@/lib/api/announcements-client';

/**
 * Get published announcements (public)
 */
export function usePublishedAnnouncements() {
  return useQuery({
    queryKey: ['announcements', 'published'],
    queryFn: () => announcementsAPI.getPublished(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get active announcement
 */
export function useActiveAnnouncement() {
  return useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: () => announcementsAPI.getActive(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get all announcements (admin only)
 */
export function useAllAnnouncements(adminAddress?: string) {
  return useQuery({
    queryKey: ['announcements', 'all', adminAddress],
    queryFn: () => announcementsAPI.getAll(adminAddress!),
    enabled: !!adminAddress,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Create announcement mutation
 */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: (data: Omit<CreateAnnouncementData, 'createdBy'>) => {
      if (!address) throw new Error('Wallet not connected');
      return announcementsAPI.create({ ...data, createdBy: address });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

/**
 * Update announcement mutation
 */
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAnnouncementData }) => {
      if (!address) throw new Error('Wallet not connected');
      return announcementsAPI.update(id, data, address);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

/**
 * Delete announcement mutation
 */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: (id: string) => {
      if (!address) throw new Error('Wallet not connected');
      return announcementsAPI.delete(id, address);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

/**
 * Publish announcement mutation
 */
export function usePublishAnnouncement() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: (id: string) => {
      if (!address) throw new Error('Wallet not connected');
      return announcementsAPI.publish(id, address);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

/**
 * Archive announcement mutation
 */
export function useArchiveAnnouncement() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: (id: string) => {
      if (!address) throw new Error('Wallet not connected');
      return announcementsAPI.archive(id, address);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}
