/**
 * Hook to fetch token balances for a poll
 * Returns balances for multiple tokens
 */

'use client'

import { useMemo } from 'react'
import { Address } from 'viem'
import { usePollTokenBalance } from '@/lib/contracts/polls-contract-utils'

export interface TokenBalance {
  token: string
  balance: bigint
  symbol: string
}

// Native token address on Mantle
const NATIVE_MNT = '0x0000000000000000000000000000000000000000' as Address

// Token symbol mapping
const TOKEN_SYMBOLS: Record<string, string> = {
  '0x0000000000000000000000000000000000000000': 'MNT',
  // Add more tokens as needed
}

/**
 * Get token symbol from address
 */
function getTokenSymbol(address: string): string {
  return TOKEN_SYMBOLS[address.toLowerCase()] || 'TOKEN'
}

/**
 * Hook to fetch balances for multiple tokens for a specific poll
 * @param pollId - The poll ID
 * @param tokens - Array of token addresses to check balances for
 */
export function usePollTokenBalances(pollId: number, tokens?: Address[]) {
  // Default to checking MNT if no tokens specified
  const tokenList = tokens || [NATIVE_MNT]

  // Fetch balance for each token
  const balanceQueries = tokenList.map((token) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return usePollTokenBalance(pollId, token)
  })

  // Combine results into TokenBalance array
  const balances: TokenBalance[] = useMemo(() => {
    return tokenList
      .map((token, index) => {
        const query = balanceQueries[index]
        const balance = query.data as bigint | undefined

        // Only include tokens with non-zero balance
        if (!balance || balance === BigInt(0)) {
          return null
        }

        return {
          token,
          balance,
          symbol: getTokenSymbol(token),
        }
      })
      .filter((b): b is TokenBalance => b !== null)
  }, [tokenList, balanceQueries])

  // Check if any query is still loading
  const isLoading = balanceQueries.some((q) => q.isLoading)

  // Check if any query has error
  const hasError = balanceQueries.some((q) => q.error)

  return {
    balances,
    isLoading,
    hasError,
    refetch: () => balanceQueries.forEach((q) => q.refetch()),
  }
}

/**
 * Hook to get balances from poll fundings
 * Automatically fetches balances for all tokens that funded the poll
 */
export function usePollTokenBalancesFromFundings(pollId: number) {
  // Import here to avoid circular dependency
  const { useSubgraphPollFundings } = require('@/hooks/subgraph/use-subgraph-fundings')

  const { fundings, loading: fundingsLoading } = useSubgraphPollFundings(pollId)

  // Get unique token addresses from fundings
  const tokens = useMemo(() => {
    const uniqueTokens = new Set<Address>()
    fundings.forEach((funding) => {
      uniqueTokens.add(funding.token as Address)
    })
    // Always include MNT
    uniqueTokens.add(NATIVE_MNT)
    return Array.from(uniqueTokens)
  }, [fundings])

  const { balances, isLoading: balancesLoading, hasError, refetch } =
    usePollTokenBalances(pollId, tokens)

  return {
    balances,
    isLoading: fundingsLoading || balancesLoading,
    hasError,
    refetch,
  }
}
