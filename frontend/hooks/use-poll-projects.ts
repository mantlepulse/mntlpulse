import { useQuery } from '@tanstack/react-query'
import { fetchProjectsByPoll } from '@/lib/api/projects-client'

/**
 * Fetch all projects containing a specific poll
 */
export function usePollProjects(chainId: number | undefined, pollId: string | undefined) {
  return useQuery({
    queryKey: ['poll-projects', chainId, pollId],
    queryFn: async () => {
      if (!chainId || !pollId) return []
      return fetchProjectsByPoll(chainId, pollId)
    },
    enabled: !!chainId && !!pollId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
