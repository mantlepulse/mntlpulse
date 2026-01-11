"use client"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Crown, Sparkles, Lock, Coins } from "lucide-react"
import { useAccount } from "wagmi"
import { useIsPremiumOrStaked, useSubscription, useTimeRemaining, formatTimeRemaining, formatSubscription } from "@/lib/contracts/premium-contract-utils"
import { useIsPremiumByStaking } from "@/lib/contracts/staking-contract-utils"
import { SubscriptionTier, TIER_NAMES } from "@/lib/contracts/premium-contract"

interface PremiumBadgeProps {
  size?: "sm" | "md" | "lg"
  showTooltip?: boolean
  className?: string
}

export function PremiumBadge({ size = "md", showTooltip = true, className = "" }: PremiumBadgeProps) {
  const { address } = useAccount()

  const { data: isPremium, isLoading } = useIsPremiumOrStaked(address)
  const { data: subscription } = useSubscription(address)
  const { data: isPremiumByStaking } = useIsPremiumByStaking(address)
  const { data: timeRemaining } = useTimeRemaining(address)

  if (isLoading) {
    return null
  }

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  }

  const iconSize = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  // Determine source of premium access
  const formattedSub = formatSubscription(subscription)
  const isSubscribed = formattedSub?.isActive
  const subscriptionTier = formattedSub?.tier ?? SubscriptionTier.NONE

  if (!isPremium) {
    if (!showTooltip) {
      return (
        <Badge variant="outline" className={`${sizeClasses[size]} ${className}`}>
          <Lock className={`${iconSize[size]} mr-1`} />
          Premium
        </Badge>
      )
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`${sizeClasses[size]} cursor-help ${className}`}>
              <Lock className={`${iconSize[size]} mr-1`} />
              Premium
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">
              Subscribe or stake 10,000 PULSE to unlock premium features
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // User has premium
  const badge = (
    <Badge
      className={`${sizeClasses[size]} bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-none ${className}`}
    >
      {isPremiumByStaking as boolean ? (
        <Coins className={`${iconSize[size]} mr-1`} />
      ) : (
        <Crown className={`${iconSize[size]} mr-1`} />
      )}
      Premium
      {(isPremiumByStaking as boolean) && (
        <Sparkles className={`${iconSize[size]} ml-1`} />
      )}
    </Badge>
  )

  if (!showTooltip) {
    return badge
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{badge}</span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            {isPremiumByStaking ? (
              <p className="text-sm font-medium">Premium via Staking</p>
            ) : (
              <>
                <p className="text-sm font-medium">
                  {TIER_NAMES[subscriptionTier]} Subscription
                </p>
                {timeRemaining && subscriptionTier !== SubscriptionTier.LIFETIME && (
                  <p className="text-xs text-muted-foreground">
                    {formatTimeRemaining(timeRemaining as bigint)} remaining
                  </p>
                )}
                {subscriptionTier === SubscriptionTier.LIFETIME && (
                  <p className="text-xs text-muted-foreground">Never expires</p>
                )}
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Compact inline badge for use in headers/navigation
export function PremiumIndicator() {
  const { address } = useAccount()
  const { data: isPremium, isLoading } = useIsPremiumOrStaked(address)

  if (isLoading || !isPremium) {
    return null
  }

  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500">
      <Crown className="h-3 w-3 text-white" />
    </span>
  )
}
