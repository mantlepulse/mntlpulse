/**
 * Hook to fetch current ETH/USD price
 * Uses CoinGecko API for price data
 */

import { useState, useEffect } from "react"

interface ETHPriceData {
  price: number | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

// Cache the price to avoid too many API calls
let cachedPrice: number | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 60000 // 1 minute cache

export function useETHPrice(): ETHPriceData {
  const [price, setPrice] = useState<number | null>(cachedPrice)
  const [loading, setLoading] = useState(!cachedPrice)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    cacheTimestamp ? new Date(cacheTimestamp) : null
  )

  useEffect(() => {
    async function fetchPrice() {
      // Check if cache is still valid
      if (cachedPrice && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
        setPrice(cachedPrice)
        setLastUpdated(new Date(cacheTimestamp))
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Using CoinGecko API (free, no API key needed)
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
        )

        if (!response.ok) {
          throw new Error("Failed to fetch ETH price")
        }

        const data = await response.json()
        const ethPrice = data.ethereum?.usd

        if (typeof ethPrice === "number") {
          // Update cache
          cachedPrice = ethPrice
          cacheTimestamp = Date.now()

          setPrice(ethPrice)
          setLastUpdated(new Date())
        } else {
          throw new Error("Invalid price data")
        }
      } catch (err) {
        console.error("Error fetching ETH price:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch price")
        // Use fallback price if fetch fails
        if (!cachedPrice) {
          setPrice(3000) // Fallback price
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPrice()

    // Refresh price every minute
    const interval = setInterval(fetchPrice, CACHE_DURATION)

    return () => clearInterval(interval)
  }, [])

  return { price, loading, error, lastUpdated }
}

/**
 * Calculate PULSE tokens for ETH based on current ETH price
 * Base rate: 1 USDC = 100 PULSE
 * So: 1 ETH = (ETH price in USD) × 100 PULSE
 */
export function calculatePulseForETH(ethAmount: number, ethPriceUSD: number): number {
  const usdValue = ethAmount * ethPriceUSD
  const pulsePerUSDC = 100 // 1 USDC = 100 PULSE
  return usdValue * pulsePerUSDC
}

/**
 * Calculate ETH needed for a specific PULSE amount
 * Base rate: 1 USDC = 100 PULSE
 * So: PULSE / 100 = USD value, then USD / ETH price = ETH needed
 */
export function calculateETHForPulse(pulseAmount: number, ethPriceUSD: number): number {
  const usdValue = pulseAmount / 100 // 100 PULSE per USDC
  return usdValue / ethPriceUSD
}

/**
 * Format ETH to PULSE rate string for display
 */
export function formatETHToPulseRate(ethPriceUSD: number): string {
  const pulsePerETH = ethPriceUSD * 100 // 1 ETH = (ETH price) × 100 PULSE
  return `1 ETH = ${pulsePerETH.toLocaleString()} PULSE (at ~$${ethPriceUSD.toLocaleString()}/ETH)`
}
