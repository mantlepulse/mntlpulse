/**
 * React hooks for Sideshift integration
 */

import { useState, useEffect, useCallback } from 'react';
import {
  sideshiftAPI,
  CreateShiftParams,
  SupportedAsset,
  handleSideshiftError,
  ShiftResponse,
} from '@/lib/api/sideshift-client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for creating and managing shifts
 */
export function useSideshift() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createShift = useCallback(
    async (params: CreateShiftParams): Promise<ShiftResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await sideshiftAPI.createShift(params);

        toast({
          title: 'Shift Created',
          description: `Send ${result.sideshift.depositCoin} to the deposit address`,
        });

        return result;
      } catch (err) {
        const errorMessage = handleSideshiftError(err);
        setError(errorMessage);

        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });

        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const getShiftStatus = useCallback(async (shiftId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await sideshiftAPI.getShiftStatus(shiftId);
      return result;
    } catch (err) {
      const errorMessage = handleSideshiftError(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createShift,
    getShiftStatus,
    loading,
    error,
  };
}

/**
 * Hook for getting supported assets
 * Only fetches on the client side to avoid SSR issues
 */
export function useSupportedAssets() {
  const [assets, setAssets] = useState<SupportedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchAssets = async () => {
      try {
        const data = await sideshiftAPI.getSupportedAssets();
        if (mounted) {
          setAssets(data.assets);
        }
      } catch (err) {
        if (mounted) {
          setError(handleSideshiftError(err));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAssets();

    return () => {
      mounted = false;
    };
  }, []);

  return { assets, loading, error };
}

/**
 * Hook for monitoring shift status with polling
 */
export function useShiftMonitor(shiftId: string | null, intervalMs: number = 5000) {
  const [status, setStatus] = useState<string | null>(null);
  const [shiftData, setShiftData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shiftId) return;

    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkStatus = async () => {
      if (!mounted) return;

      setLoading(true);
      try {
        const result = await sideshiftAPI.getShiftStatus(shiftId);
        if (mounted) {
          setStatus(result.shift.status);
          setShiftData(result);
          setError(null);

          // Continue polling if not in final state
          if (!['settled', 'refunded', 'expired'].includes(result.shift.status)) {
            timeoutId = setTimeout(checkStatus, intervalMs);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(handleSideshiftError(err));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkStatus();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [shiftId, intervalMs]);

  return { status, shiftData, loading, error };
}

/**
 * Hook for getting user's shift history
 */
export function useUserShifts(address: string | undefined) {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const result = await sideshiftAPI.getUserShifts(address as `0x${string}`);
      setShifts(result.shifts);
    } catch (err) {
      setError(handleSideshiftError(err));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { shifts, loading, error, refresh };
}

/**
 * Hook for getting poll's shift history
 */
export function usePollShifts(pollId: string | undefined) {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!pollId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await sideshiftAPI.getPollShifts(pollId);
      setShifts(result.shifts);
    } catch (err) {
      setError(handleSideshiftError(err));
    } finally {
      setLoading(false);
    }
  }, [pollId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { shifts, loading, error, refresh };
}
