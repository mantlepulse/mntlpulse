/**
 * Multi-Network Balance Hook
 * Queries wallet balances across different EVM networks using public RPC endpoints
 */

import { useQuery } from '@tanstack/react-query'
import { createPublicClient, http, formatUnits, type Address } from 'viem'
import { getNetworkConfig, isNetworkSupported } from '@/lib/utils/rpc-config'

// ERC20 Token ABI - only balanceOf function needed
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
] as const

interface UseMultiNetworkBalanceParams {
  address?: Address
  networkId?: string
  tokenAddress?: Address
  enabled?: boolean
  refetchInterval?: number
}

interface BalanceResult {
  balance: bigint | null
  formatted: string | null
  decimals: number
  symbol: string
  isLoading: boolean
  isError: boolean
  error: Error | null
}

/**
 * Fetch native currency balance (ETH, BNB, MATIC, etc.)
 */
async function fetchNativeBalance(
  address: Address,
  networkId: string
): Promise<{ balance: bigint; decimals: number; symbol: string }> {
  const networkConfig = getNetworkConfig(networkId)
  if (!networkConfig) {
    throw new Error(`Network ${networkId} is not supported`)
  }

  // Try RPC endpoints in order until one succeeds
  let lastError: Error | null = null
  for (const rpcUrl of networkConfig.rpcUrls) {
    try {
      const client = createPublicClient({
        chain: {
          id: networkConfig.chainId,
          name: networkConfig.name,
          nativeCurrency: networkConfig.nativeCurrency,
          rpcUrls: {
            default: { http: [rpcUrl] },
            public: { http: [rpcUrl] },
          },
        },
        transport: http(rpcUrl, {
          timeout: 10000, // 10 second timeout
        }),
      })

      const balance = await client.getBalance({ address })

      return {
        balance,
        decimals: networkConfig.nativeCurrency.decimals,
        symbol: networkConfig.nativeCurrency.symbol,
      }
    } catch (error) {
      lastError = error as Error
      // Try next RPC endpoint
      continue
    }
  }

  throw lastError || new Error('All RPC endpoints failed')
}

/**
 * Fetch ERC20 token balance
 */
async function fetchTokenBalance(
  address: Address,
  networkId: string,
  tokenAddress: Address
): Promise<{ balance: bigint; decimals: number; symbol: string }> {
  const networkConfig = getNetworkConfig(networkId)
  if (!networkConfig) {
    throw new Error(`Network ${networkId} is not supported`)
  }

  // Try RPC endpoints in order until one succeeds
  let lastError: Error | null = null
  for (const rpcUrl of networkConfig.rpcUrls) {
    try {
      const client = createPublicClient({
        chain: {
          id: networkConfig.chainId,
          name: networkConfig.name,
          nativeCurrency: networkConfig.nativeCurrency,
          rpcUrls: {
            default: { http: [rpcUrl] },
            public: { http: [rpcUrl] },
          },
        },
        transport: http(rpcUrl, {
          timeout: 10000,
        }),
      })

      // Fetch balance and decimals in parallel
      const [balance, decimals] = await Promise.all([
        client.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        }) as Promise<bigint>,
        client.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
      ])

      return {
        balance,
        decimals,
        symbol: 'TOKEN', // Could fetch symbol too, but not needed for now
      }
    } catch (error) {
      lastError = error as Error
      continue
    }
  }

  throw lastError || new Error('All RPC endpoints failed')
}

/**
 * Hook to fetch balance for any EVM network
 *
 * @param address - Wallet address to query
 * @param networkId - Network identifier (e.g., 'ethereum', 'bsc', 'polygon')
 * @param tokenAddress - Optional token address for ERC20 tokens
 * @param enabled - Whether to enable the query
 * @param refetchInterval - Automatic refetch interval in milliseconds
 */
export function useMultiNetworkBalance({
  address,
  networkId,
  tokenAddress,
  enabled = true,
  refetchInterval = 10000, // Default 10 seconds
}: UseMultiNetworkBalanceParams): BalanceResult {
  const query = useQuery({
    queryKey: ['multiNetworkBalance', address, networkId, tokenAddress],
    queryFn: async () => {
      if (!address || !networkId) {
        return null
      }

      if (!isNetworkSupported(networkId)) {
        throw new Error(`Network ${networkId} is not supported`)
      }

      if (tokenAddress) {
        return await fetchTokenBalance(address, networkId, tokenAddress)
      } else {
        return await fetchNativeBalance(address, networkId)
      }
    },
    enabled: enabled && !!address && !!networkId,
    refetchInterval,
    retry: 2, // Retry failed requests twice
    staleTime: 5000, // Consider data stale after 5 seconds
  })

  const balance = query.data?.balance ?? null
  const decimals = query.data?.decimals ?? 18
  const symbol = query.data?.symbol ?? 'TOKEN'

  return {
    balance,
    formatted: balance !== null ? formatUnits(balance, decimals) : null,
    decimals,
    symbol,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  }
}
