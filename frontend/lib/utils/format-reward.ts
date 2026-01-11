/**
 * Reward formatting utility functions
 * Formats token amounts for human-readable display based on token type
 */

/**
 * Format reward amount for display
 * - USDC: Show 2 decimal places (e.g., "0.10 USDC")
 * - ETH: Show up to 6 significant decimals (e.g., "0.001 ETH")
 * - PULSE: Show up to 2 decimal places (e.g., "100.00 PULSE")
 */
export function formatRewardDisplay(amount: number, tokenSymbol?: string): string {
  const symbol = tokenSymbol?.toUpperCase() || 'ETH'

  // Handle zero or very small amounts
  if (amount === 0) {
    return `0 ${symbol}`
  }

  // Format based on token type
  if (symbol === 'USDC') {
    // USDC - always show 2 decimal places for currency
    return `${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${symbol}`
  }

  if (symbol === 'ETH') {
    // ETH - show up to 6 decimals, but trim trailing zeros
    if (amount >= 1) {
      return `${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })} ${symbol}`
    }
    // For small amounts, show more precision
    return `${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })} ${symbol}`
  }

  // PULSE and other tokens - show 2 decimals for whole numbers, more for small
  if (amount >= 1) {
    return `${amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} ${symbol}`
  }

  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} ${symbol}`
}

/**
 * Format total rewards for stats display (summary across different tokens)
 * Since rewards can be in different tokens, this is best effort
 */
export function formatTotalRewards(totalETH: number, totalUSDC: number = 0, totalPULSE: number = 0): string {
  const parts: string[] = []

  if (totalETH > 0) {
    parts.push(formatRewardDisplay(totalETH, 'ETH'))
  }
  if (totalUSDC > 0) {
    parts.push(formatRewardDisplay(totalUSDC, 'USDC'))
  }
  if (totalPULSE > 0) {
    parts.push(formatRewardDisplay(totalPULSE, 'PULSE'))
  }

  if (parts.length === 0) {
    return '0 ETH'
  }

  return parts.join(' + ')
}
