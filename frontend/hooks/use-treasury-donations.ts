'use client'

/**
 * Hook for fetching treasury donation events from the PollsContract
 */

import { useState, useEffect, useCallback } from 'react'
import { useChainId } from 'wagmi'
import { getPublicClient } from 'wagmi/actions'
import { parseAbiItem, formatUnits, Address } from 'viem'
import { config } from '@/lib/wagmi'
import { usePollsContractAddress } from '@/lib/contracts/polls-contract-utils'
import { getTokenSymbol, TOKEN_INFO } from '@/lib/contracts/token-config'

export interface TreasuryDonation {
  pollId: number
  token: Address
  tokenSymbol: string
  amount: bigint
  formattedAmount: string
  transactionHash: string
  blockNumber: bigint
  timestamp?: Date
  donor?: Address // Creator of the poll who donated
}

interface UseTreasuryDonationsReturn {
  donations: TreasuryDonation[]
  loading: boolean
  error: Error | null
  refetch: () => void
  totalDonationsByToken: Record<string, number>
}

export function useTreasuryDonations(): UseTreasuryDonationsReturn {
  const [donations, setDonations] = useState<TreasuryDonation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const chainId = useChainId()
  const contractAddress = usePollsContractAddress()

  const fetchDonations = useCallback(async () => {
    if (!contractAddress) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const publicClient = getPublicClient(config, { chainId })
      if (!publicClient) {
        throw new Error('Public client not available')
      }

      // Fetch DonatedToTreasury events
      const logs = await publicClient.getLogs({
        address: contractAddress,
        event: parseAbiItem('event DonatedToTreasury(uint256 indexed pollId, address token, uint256 amount)'),
        fromBlock: 'earliest',
        toBlock: 'latest',
      })

      // Process logs into donations
      const processedDonations: TreasuryDonation[] = await Promise.all(
        logs.map(async (log) => {
          const pollId = Number(log.args.pollId)
          const token = log.args.token as Address
          const amount = log.args.amount as bigint

          // Get token symbol and decimals (MNT is native token on Mantle)
          const tokenSymbol = getTokenSymbol(chainId, token) || 'MNT'
          const decimals = TOKEN_INFO[tokenSymbol]?.decimals || 18
          const formattedAmount = formatUnits(amount, decimals)

          // Try to get block timestamp
          let timestamp: Date | undefined
          try {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
            timestamp = new Date(Number(block.timestamp) * 1000)
          } catch {
            // Ignore timestamp errors
          }

          return {
            pollId,
            token,
            tokenSymbol,
            amount,
            formattedAmount,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp,
          }
        })
      )

      // Sort by block number (newest first)
      processedDonations.sort((a, b) => Number(b.blockNumber - a.blockNumber))

      setDonations(processedDonations)
    } catch (err) {
      console.error('Failed to fetch treasury donations:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch donations'))
    } finally {
      setLoading(false)
    }
  }, [contractAddress, chainId])

  useEffect(() => {
    fetchDonations()
  }, [fetchDonations])

  // Calculate total donations by token
  const totalDonationsByToken = donations.reduce((acc, donation) => {
    const symbol = donation.tokenSymbol
    const decimals = TOKEN_INFO[symbol]?.decimals || 18
    const amount = Number(donation.amount) / Math.pow(10, decimals)
    acc[symbol] = (acc[symbol] || 0) + amount
    return acc
  }, {} as Record<string, number>)

  return {
    donations,
    loading,
    error,
    refetch: fetchDonations,
    totalDonationsByToken,
  }
}
