/**
 * Distribution Status Badge Component
 * Shows the distribution mode and status for a poll
 */

import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, AlertCircle } from "lucide-react"

type DistributionMode = 0 | 1 | 2 // MANUAL_PULL, MANUAL_PUSH, AUTOMATED

interface DistributionStatusBadgeProps {
  mode: DistributionMode
  isDistributed?: boolean
  isActive?: boolean
}

export function DistributionStatusBadge({
  mode,
  isDistributed = false,
  isActive = true,
}: DistributionStatusBadgeProps) {
  const getModeLabel = (mode: DistributionMode) => {
    switch (mode) {
      case 0:
        return "Pull"
      case 1:
        return "Push"
      case 2:
        return "Automated"
      default:
        return "Unknown"
    }
  }

  const getStatusInfo = () => {
    if (!isActive && !isDistributed) {
      return {
        label: "Pending",
        variant: "outline" as const,
        icon: Clock,
      }
    }

    if (isDistributed) {
      return {
        label: "Distributed",
        variant: "default" as const,
        icon: CheckCircle2,
      }
    }

    if (isActive) {
      return {
        label: "Active",
        variant: "secondary" as const,
        icon: Clock,
      }
    }

    return {
      label: "Pending",
      variant: "outline" as const,
      icon: AlertCircle,
    }
  }

  const modeLabel = getModeLabel(mode)
  const status = getStatusInfo()
  const StatusIcon = status.icon

  return (
    <div className="flex items-center gap-2">
      <Badge variant={status.variant} className="flex items-center gap-1">
        <StatusIcon className="h-3 w-3" />
        {status.label}
      </Badge>
      <Badge variant="outline">{modeLabel}</Badge>
    </div>
  )
}
