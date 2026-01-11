'use client'

/**
 * Hooks for seasons/tournaments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import {
  fetchSeasons,
  fetchActiveSeasons,
  fetchCreatorSeasons,
  fetchSeasonById,
  fetchSeasonLeaderboard,
  createSeason,
  updateSeason,
  deleteSeason,
  calculateSeasonDistribution,
  markSeasonDistributed,
  Season,
  SeasonStatus,
  SeasonLeaderboardEntry,
  CreateSeasonInput,
  UpdateSeasonInput,
} from '@/lib/api/seasons-client'

/**
 * Hook to fetch all seasons with optional filters
 */
export function useSeasons(options?: {
  status?: SeasonStatus
  creator?: string
  isPublic?: boolean
}) {
  return useQuery<Season[], Error>({
    queryKey: ['seasons', options],
    queryFn: () => fetchSeasons(options),
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch active seasons
 */
export function useActiveSeasons() {
  return useQuery<Season[], Error>({
    queryKey: ['active-seasons'],
    queryFn: fetchActiveSeasons,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch creator's own seasons
 */
export function useCreatorSeasons() {
  const { address, isConnected } = useAccount()

  return useQuery<Season[], Error>({
    queryKey: ['creator-seasons', address],
    queryFn: () => fetchCreatorSeasons(address!),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch a specific season by ID
 */
export function useSeasonById(id: string | undefined) {
  return useQuery<Season, Error>({
    queryKey: ['season', id],
    queryFn: () => fetchSeasonById(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch season leaderboard
 */
export function useSeasonLeaderboard(seasonId: string | undefined, limit?: number) {
  return useQuery<
    {
      season: Pick<Season, 'id' | 'name' | 'status' | 'totalPulsePool' | 'pulsePerPoint'>
      leaderboard: SeasonLeaderboardEntry[]
    },
    Error
  >({
    queryKey: ['season-leaderboard', seasonId, limit],
    queryFn: () => fetchSeasonLeaderboard(seasonId!, limit),
    enabled: !!seasonId,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to create a new season
 */
export function useCreateSeason() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<Season, Error, Omit<CreateSeasonInput, 'creatorAddress'>>({
    mutationFn: (input) => {
      if (!address) throw new Error('Wallet not connected')
      return createSeason({ ...input, creatorAddress: address })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-seasons'] })
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
      queryClient.invalidateQueries({ queryKey: ['active-seasons'] })
    },
  })
}

/**
 * Hook to update a season
 */
export function useUpdateSeason() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<Season, Error, { id: string } & Omit<UpdateSeasonInput, 'creatorAddress'>>({
    mutationFn: ({ id, ...input }) => {
      if (!address) throw new Error('Wallet not connected')
      return updateSeason(id, { ...input, creatorAddress: address })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creator-seasons'] })
      queryClient.invalidateQueries({ queryKey: ['season', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
      queryClient.invalidateQueries({ queryKey: ['active-seasons'] })
    },
  })
}

/**
 * Hook to delete a season
 */
export function useDeleteSeason() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (id) => {
      if (!address) throw new Error('Wallet not connected')
      return deleteSeason(id, address)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-seasons'] })
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
      queryClient.invalidateQueries({ queryKey: ['active-seasons'] })
    },
  })
}

/**
 * Hook to calculate PULSE distribution for a season
 */
export function useCalculateDistribution() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<
    { pulsePerPoint: string; totalPoints: number; totalPool: string },
    Error,
    string
  >({
    mutationFn: (seasonId) => {
      if (!address) throw new Error('Wallet not connected')
      return calculateSeasonDistribution(seasonId, address)
    },
    onSuccess: (_, seasonId) => {
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] })
      queryClient.invalidateQueries({ queryKey: ['season-leaderboard', seasonId] })
    },
  })
}

/**
 * Hook to mark a season as distributed
 */
export function useMarkSeasonDistributed() {
  const { address } = useAccount()
  const queryClient = useQueryClient()

  return useMutation<Season, Error, string>({
    mutationFn: (seasonId) => {
      if (!address) throw new Error('Wallet not connected')
      return markSeasonDistributed(seasonId, address)
    },
    onSuccess: (_, seasonId) => {
      queryClient.invalidateQueries({ queryKey: ['creator-seasons'] })
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] })
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
    },
  })
}
