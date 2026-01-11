/**
 * Hook for fetching poll funding history
 */

import { useState, useEffect } from 'react';
import { pollsAPI, PollFundingsResponse } from '@/lib/api/polls-client';

export function usePollFundings(chainId: number | undefined, pollId: string | undefined) {
  const [data, setData] = useState<PollFundingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFundings = async () => {
    if (!chainId || !pollId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await pollsAPI.getPollFundings(chainId, pollId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fundings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFundings();
  }, [chainId, pollId]);

  return { data, loading, error, refetch: fetchFundings };
}
