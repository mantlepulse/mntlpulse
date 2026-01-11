/**
 * Hook for fetching gas fee estimates
 */

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface FeeEstimate {
  estimatedFeeUSD: number;
  estimatedFeeETH: string;
  status: 'low' | 'medium' | 'high';
  l1Fee: string;
  l2Fee: string;
  recommendation: string;
  typicalFeeUSD: number;
  offPeakFeeUSD: number;
}

export function useFeeEstimation(
  chainId: number | undefined,
  amount: string | undefined,
  tokenAddress?: string
) {
  const [data, setData] = useState<FeeEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeeEstimate = async () => {
    if (!chainId || !amount || chainId === 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: any = {
        chainId,
        amount,
      };

      if (tokenAddress) {
        params.tokenAddress = tokenAddress;
      }

      const { data: estimate } = await axios.get<FeeEstimate>(
        `${API_URL}/api/gas/estimate-funding-fee`,
        { params }
      );

      setData(estimate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fee estimate');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeEstimate();
  }, [chainId, amount, tokenAddress]);

  return { data, loading, error, refetch: fetchFeeEstimate };
}
