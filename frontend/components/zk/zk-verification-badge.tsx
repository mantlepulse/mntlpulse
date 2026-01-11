/**
 * ZK Verification Badge
 * Displays the user's ZK verification status with tooltip
 */

"use client"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ShieldCheck, ShieldX, Shield } from "lucide-react"
import { useZKVerification, SocialType } from "@/contexts/zk-verification-context"
import { cn } from "@/lib/utils"

interface ZKVerificationBadgeProps {
  size?: "sm" | "md" | "lg"
  showTooltip?: boolean
  showWeight?: boolean
  className?: string
}

const SOCIAL_LABELS: Record<SocialType, string> = {
  TWITTER: "Twitter/X",
  DISCORD: "Discord",
  GITHUB: "GitHub",
  TELEGRAM: "Telegram",
}

const SIZE_CLASSES = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-sm px-2 py-1",
  lg: "text-base px-3 py-1.5",
}

const ICON_SIZES = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
}

export function ZKVerificationBadge({
  size = "md",
  showTooltip = true,
  showWeight = false,
  className,
}: ZKVerificationBadgeProps) {
  const { isEnabled, status, canAccessZKFeatures } = useZKVerification()

  // Don't show if ZK verification is disabled
  if (!isEnabled) return null

  const isVerified = status.verificationCount > 0
  const isLoading = status.isLoading

  // Icon based on status
  const Icon = isLoading ? Shield : isVerified ? ShieldCheck : ShieldX
  const iconClass = cn(
    ICON_SIZES[size],
    isLoading && "animate-pulse"
  )

  // Badge content
  const badgeContent = (
    <Badge
      variant={isVerified ? "default" : "outline"}
      className={cn(
        SIZE_CLASSES[size],
        isVerified && "bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0",
        !isVerified && !canAccessZKFeatures && "opacity-50",
        className
      )}
    >
      <Icon className={iconClass} />
      {isLoading ? (
        <span>Loading...</span>
      ) : isVerified ? (
        <span>
          ZK Verified
          {showWeight && status.votingWeight > 1 && (
            <span className="ml-1">({status.votingWeight}x)</span>
          )}
        </span>
      ) : (
        <span>Unverified</span>
      )}
    </Badge>
  )

  if (!showTooltip) return badgeContent

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">ZK Identity Verification</p>
            {isVerified ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Voting Weight: {status.votingWeight}x
                </p>
                <div className="text-xs space-y-0.5">
                  {(Object.keys(SOCIAL_LABELS) as SocialType[]).map((type) => {
                    const isTypeVerified = status[type.toLowerCase() as keyof typeof status]
                    return (
                      <div key={type} className="flex items-center gap-1">
                        <span className={isTypeVerified ? "text-green-500" : "text-muted-foreground"}>
                          {isTypeVerified ? "✓" : "○"}
                        </span>
                        <span>{SOCIAL_LABELS[type]}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : canAccessZKFeatures ? (
              <p className="text-xs text-muted-foreground">
                Verify your social accounts to increase voting power and access protected polls.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Premium required. Subscribe or stake PULSE to unlock ZK verification.
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Compact badge showing just the verification count
 */
export function ZKVerificationCountBadge({ className }: { className?: string }) {
  const { isEnabled, status } = useZKVerification()

  if (!isEnabled || status.verificationCount === 0) return null

  return (
    <Badge
      variant="outline"
      className={cn(
        "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
        className
      )}
    >
      <ShieldCheck className="h-3 w-3 mr-1" />
      {status.verificationCount}/4
    </Badge>
  )
}

/**
 * Badge showing voting weight multiplier
 */
export function ZKVotingWeightBadge({ className }: { className?: string }) {
  const { isEnabled, status } = useZKVerification()

  if (!isEnabled || status.votingWeight <= 1) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "bg-gradient-to-r from-emerald-500/10 to-green-500/10",
              "text-emerald-600 border-emerald-500/30",
              className
            )}
          >
            {status.votingWeight}x Vote Power
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Your votes count {status.votingWeight}x due to ZK verification.
            <br />
            Base weight (1x) + {status.verificationCount} verified account{status.verificationCount !== 1 ? 's' : ''}.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
