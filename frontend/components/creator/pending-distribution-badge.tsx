/**
 * Pending Distribution Badge Component
 * Visual indicator for polls requiring distribution action
 */

import { Badge } from "@/components/ui/badge"
import { AlertCircle, Download } from "lucide-react"

interface PendingDistributionBadgeProps {
  hasPending: boolean
  mode: 0 | 1 | 2 // MANUAL_PULL, MANUAL_PUSH, AUTOMATED
  count?: number
  variant?: "default" | "compact"
}

export function PendingDistributionBadge({
  hasPending,
  mode,
  count,
  variant = "default",
}: PendingDistributionBadgeProps) {
  if (!hasPending) return null

  // MANUAL_PUSH mode - Creator needs to distribute
  if (mode === 1) {
    return (
      <Badge
        variant="outline"
        className="border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400"
      >
        <AlertCircle className="mr-1 h-3 w-3" />
        {variant === "compact" ? "Action" : "Action Required"}
        {count !== undefined && count > 0 && ` (${count})`}
      </Badge>
    )
  }

  // MANUAL_PULL mode - Funds available for withdrawal
  if (mode === 0) {
    return (
      <Badge
        variant="outline"
        className="border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
      >
        <Download className="mr-1 h-3 w-3" />
        {variant === "compact" ? "Withdraw" : "Funds Available"}
      </Badge>
    )
  }

  return null
}
