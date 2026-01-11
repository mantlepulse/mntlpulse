/**
 * Hook to determine if a poll has pending distributions
 * Used by creator UI to show action indicators
 */

import { useMemo } from "react"

interface Poll {
  id: bigint
  question: string
  isActive: boolean
  totalFunding: bigint
  endTime: bigint
  distributionMode: 0 | 1 | 2
}

interface PendingStatus {
  hasPending: boolean
  reason:
    | "not_ended"
    | "no_funds"
    | "still_active"
    | "automated_mode"
    | "pending_distribution"
    | "funds_available"
    | "no_action_needed"
}

/**
 * Determines if a poll has pending distributions requiring creator action
 *
 * Logic:
 * - Poll must have ended (endTime < now)
 * - Poll must be closed (!isActive)
 * - Poll must have funds (totalFunding > 0)
 * - Distribution mode must be MANUAL_PULL (0) or MANUAL_PUSH (1)
 *
 * Future enhancement: Check distribution history via API
 */
export function usePendingDistributions(poll: Poll | null): PendingStatus {
  return useMemo(() => {
    if (!poll) {
      return { hasPending: false, reason: "no_action_needed" }
    }

    const now = BigInt(Math.floor(Date.now() / 1000))
    const hasEnded = poll.endTime < now
    const hasFunds = poll.totalFunding > BigInt(0)
    const isClosed = !poll.isActive

    // Check if poll hasn't ended yet
    if (!hasEnded) {
      return { hasPending: false, reason: "not_ended" }
    }

    // Check if poll is still active
    if (!isClosed) {
      return { hasPending: false, reason: "still_active" }
    }

    // Check if poll has no funds
    if (!hasFunds) {
      return { hasPending: false, reason: "no_funds" }
    }

    // Check distribution mode
    switch (poll.distributionMode) {
      case 0: // MANUAL_PULL
        // Funds are available for withdrawal
        return { hasPending: true, reason: "funds_available" }

      case 1: // MANUAL_PUSH
        // Creator needs to distribute rewards
        return { hasPending: true, reason: "pending_distribution" }

      case 2: // AUTOMATED
        // No manual action needed
        return { hasPending: false, reason: "automated_mode" }

      default:
        return { hasPending: false, reason: "no_action_needed" }
    }
  }, [poll])
}

/**
 * Calculates the total number of polls with pending distributions
 */
export function usePendingDistributionsCount(polls: Poll[]): number {
  return useMemo(() => {
    const now = BigInt(Math.floor(Date.now() / 1000))

    return polls.filter((poll) => {
      const hasEnded = poll.endTime < now
      const hasFunds = poll.totalFunding > BigInt(0)
      const isClosed = !poll.isActive
      const isManualMode = poll.distributionMode === 0 || poll.distributionMode === 1

      return hasEnded && isClosed && hasFunds && isManualMode
    }).length
  }, [polls])
}
