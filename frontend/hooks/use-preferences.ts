/**
 * User Preferences Hooks
 * React hooks for managing user preferences with React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import {
  preferencesAPI,
  UserPreferences,
  UpdatePreferencesData,
} from '@/lib/api/preferences-client';

/**
 * Hook to get user preferences
 */
export function useUserPreferences(address?: string) {
  const { address: connectedAddress } = useAccount();
  const effectiveAddress = address || connectedAddress;

  return useQuery({
    queryKey: ['preferences', effectiveAddress],
    queryFn: () => preferencesAPI.get(effectiveAddress!),
    enabled: !!effectiveAddress,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to update user preferences
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: (data: UpdatePreferencesData) => {
      if (!address) throw new Error('Wallet not connected');
      return preferencesAPI.update(address, data);
    },
    onMutate: async (newData) => {
      if (!address) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['preferences', address] });

      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData<UserPreferences>([
        'preferences',
        address,
      ]);

      // Optimistically update
      queryClient.setQueryData<UserPreferences>(['preferences', address], (old) => {
        if (!old) return old;
        return { ...old, ...newData };
      });

      return { previousPreferences };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (address && context?.previousPreferences) {
        queryClient.setQueryData(['preferences', address], context.previousPreferences);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      if (address) {
        queryClient.invalidateQueries({ queryKey: ['preferences', address] });
      }
    },
  });
}

/**
 * Hook to update preferred token
 */
export function useUpdatePreferredToken() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: (token: string) => {
      if (!address) throw new Error('Wallet not connected');
      return preferencesAPI.updateToken(address, token);
    },
    onMutate: async (token) => {
      if (!address) return;

      await queryClient.cancelQueries({ queryKey: ['preferences', address] });

      const previousPreferences = queryClient.getQueryData<UserPreferences>([
        'preferences',
        address,
      ]);

      queryClient.setQueryData<UserPreferences>(['preferences', address], (old) => {
        if (!old) return old;
        return { ...old, preferredToken: token };
      });

      return { previousPreferences };
    },
    onError: (err, token, context) => {
      if (address && context?.previousPreferences) {
        queryClient.setQueryData(['preferences', address], context.previousPreferences);
      }
    },
    onSettled: () => {
      if (address) {
        queryClient.invalidateQueries({ queryKey: ['preferences', address] });
      }
    },
  });
}

/**
 * Hook to update auto-claim setting
 */
export function useUpdateAutoClaim() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: (enabled: boolean) => {
      if (!address) throw new Error('Wallet not connected');
      return preferencesAPI.updateAutoClaim(address, enabled);
    },
    onMutate: async (enabled) => {
      if (!address) return;

      await queryClient.cancelQueries({ queryKey: ['preferences', address] });

      const previousPreferences = queryClient.getQueryData<UserPreferences>([
        'preferences',
        address,
      ]);

      queryClient.setQueryData<UserPreferences>(['preferences', address], (old) => {
        if (!old) return old;
        return { ...old, autoClaimEnabled: enabled };
      });

      return { previousPreferences };
    },
    onError: (err, enabled, context) => {
      if (address && context?.previousPreferences) {
        queryClient.setQueryData(['preferences', address], context.previousPreferences);
      }
    },
    onSettled: () => {
      if (address) {
        queryClient.invalidateQueries({ queryKey: ['preferences', address] });
      }
    },
  });
}
