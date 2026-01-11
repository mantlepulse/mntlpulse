"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Crown,
  Check,
  Loader2,
  Sparkles,
  Clock,
  Infinity,
  AlertCircle
} from "lucide-react"
import { formatEther, Address } from "viem"
import { useAccount } from "wagmi"
import { toast } from "sonner"
import {
  useUserPremiumStatus,
  useSubscribe,
  useExtendSubscription,
  useApprovePulseForPremium,
  usePulseAllowanceForPremium,
  usePremiumContractAddress,
  formatTimeRemaining,
} from "@/lib/contracts/premium-contract-utils"
import { usePulseTokenAddress, usePulseBalance } from "@/lib/contracts/premium-contract-utils"
import { SubscriptionTier, TIER_NAMES } from "@/lib/contracts/premium-contract"
import { SubscriptionSuccessDialog } from "./subscription-success-dialog"

const tierFeatures = [
  "Create Quadratic Voting polls",
  "Early access to new features",
  "Priority support",
  "Custom poll branding",
  "Advanced analytics",
]

interface TierCardProps {
  tier: SubscriptionTier
  name: string
  price: bigint | undefined
  duration: string
  isPopular?: boolean
  isActive: boolean
  onSubscribe: (tier: SubscriptionTier) => void
  isProcessing: boolean
  userBalance: bigint | undefined
  needsApproval: boolean
  onApprove: () => void
  isApproving: boolean
}

function TierCard({
  tier,
  name,
  price,
  duration,
  isPopular,
  isActive,
  onSubscribe,
  isProcessing,
  userBalance,
  needsApproval,
  onApprove,
  isApproving,
}: TierCardProps) {
  const formattedPrice = price ? Number(formatEther(price)).toLocaleString() : "..."
  const hasSufficientBalance = userBalance && price && userBalance >= price

  return (
    <Card className={`relative ${isPopular ? "border-primary shadow-lg" : ""} ${isActive ? "border-green-500" : ""}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
        </div>
      )}
      {isActive && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-green-500 text-white">Current Plan</Badge>
        </div>
      )}
      <CardHeader className="text-center pt-8">
        <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
          {tier === SubscriptionTier.LIFETIME ? (
            <Infinity className="h-6 w-6 text-primary" />
          ) : (
            <Clock className="h-6 w-6 text-primary" />
          )}
        </div>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{duration}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <span className="text-4xl font-bold">{formattedPrice}</span>
          <span className="text-muted-foreground ml-2">PULSE</span>
        </div>

        <ul className="space-y-3">
          {tierFeatures.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {!hasSufficientBalance && price && (
          <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-xs">
            <AlertCircle className="h-3 w-3 text-amber-600 mt-0.5" />
            <span className="text-amber-700 dark:text-amber-400">Insufficient balance</span>
          </div>
        )}

        <div className="space-y-2">
          {needsApproval && hasSufficientBalance ? (
            <>
              <Button
                onClick={onApprove}
                disabled={isApproving}
                className="w-full"
                variant="outline"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  "Approve PULSE"
                )}
              </Button>
              {isApproving && (
                <p className="text-xs text-center text-muted-foreground">
                  Please confirm the transaction in your wallet...
                </p>
              )}
            </>
          ) : (
            <>
              <Button
                onClick={() => onSubscribe(tier)}
                disabled={isProcessing || isActive || !hasSufficientBalance}
                className="w-full"
                variant={isPopular ? "default" : "outline"}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : isActive ? (
                  "Current Plan"
                ) : (
                  `Subscribe to ${name}`
                )}
              </Button>
              {isProcessing && (
                <p className="text-xs text-center text-muted-foreground">
                  Transaction confirming on-chain...
                </p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function SubscriptionTiers() {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [subscribedTier, setSubscribedTier] = useState<SubscriptionTier | null>(null)

  const { address } = useAccount()
  const premiumContract = usePremiumContractAddress()
  const pulseToken = usePulseTokenAddress()

  // Get user's premium status
  const {
    subscription,
    tierPrices,
    pulseBalance,
    timeRemaining,
    isLoading
  } = useUserPremiumStatus()

  // Get allowance
  const { data: allowance, refetch: refetchAllowance } = usePulseAllowanceForPremium(address)

  // Subscription hooks
  const {
    subscribe,
    isPending: isSubscribing,
    isConfirming: isSubConfirming,
    isSuccess: isSubSuccess,
    error: subError,
  } = useSubscribe()

  const {
    extendSubscription,
    isPending: isExtending,
    isConfirming: isExtConfirming,
    isSuccess: isExtSuccess,
    error: extError,
  } = useExtendSubscription()

  const {
    approve,
    isPending: isApproving,
    isConfirming: isApproveConfirming,
    isSuccess: isApproveSuccess,
    error: approveError,
  } = useApprovePulseForPremium()

  // Check if approval needed for selected tier
  const selectedTierPrice = selectedTier ? tierPrices[selectedTier] : undefined
  const needsApproval = selectedTier && selectedTierPrice
    ? !allowance || allowance < selectedTierPrice
    : false

  // Handle success/errors
  useEffect(() => {
    if (isSubSuccess || isExtSuccess) {
      toast.success("Subscription successful!")
      setSubscribedTier(selectedTier)
      setShowSuccessDialog(true)
      setSelectedTier(null)
    }
  }, [isSubSuccess, isExtSuccess, selectedTier])

  useEffect(() => {
    if (isApproveSuccess) {
      toast.success("PULSE approved! You can now subscribe.")
      refetchAllowance()
      // Reset selected tier after short delay to let allowance update
      setTimeout(() => {
        setSelectedTier(null)
      }, 1000)
    }
  }, [isApproveSuccess, refetchAllowance])

  useEffect(() => {
    if (subError) toast.error(`Subscription failed: ${subError.message}`)
    if (extError) toast.error(`Extension failed: ${extError.message}`)
    if (approveError) toast.error(`Approval failed: ${approveError.message}`)
  }, [subError, extError, approveError])

  const handleApprove = async () => {
    if (!selectedTierPrice) return
    const approvalAmount = (selectedTierPrice * BigInt(10)).toString()
    await approve(formatEther(BigInt(approvalAmount)))
  }

  const handleSubscribe = async (tier: SubscriptionTier) => {
    setSelectedTier(tier)

    if (tier === SubscriptionTier.NONE) {
      toast.error("Invalid subscription tier")
      return
    }

    const price = tierPrices[tier as keyof typeof tierPrices]
    if (!price) {
      toast.error("Price not available")
      return
    }

    // Check if user already has subscription - extend it
    if (subscription && subscription.isActive) {
      await extendSubscription(tier)
    } else {
      await subscribe(tier)
    }
  }

  const isProcessing = isSubscribing || isSubConfirming || isExtending || isExtConfirming ||
    isApproving || isApproveConfirming

  // Current subscription info
  const hasActiveSubscription = subscription?.isActive && subscription.tier !== SubscriptionTier.NONE

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
          <Crown className="h-5 w-5 text-primary" />
          <span className="font-medium text-primary">Premium Access</span>
        </div>
        <h2 className="text-3xl font-bold">Unlock Premium Features</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Subscribe to Premium to create Quadratic Voting polls and access exclusive features.
          Pay with PULSE tokens for any subscription tier.
        </p>
      </div>

      {/* Current Subscription Status */}
      {hasActiveSubscription && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-full">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Active Subscription: {TIER_NAMES[subscription!.tier]}</p>
                <p className="text-sm text-muted-foreground">
                  {timeRemaining ? formatTimeRemaining(timeRemaining) : "Loading..."}
                  {subscription?.tier !== SubscriptionTier.LIFETIME && " remaining"}
                </p>
              </div>
            </div>
            <Badge className="bg-green-500">Active</Badge>
          </CardContent>
        </Card>
      )}

      {/* Subscription Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TierCard
          tier={SubscriptionTier.MONTHLY}
          name="Monthly"
          price={tierPrices[SubscriptionTier.MONTHLY]}
          duration="30 days"
          isActive={subscription?.tier === SubscriptionTier.MONTHLY}
          onSubscribe={handleSubscribe}
          isProcessing={isProcessing && selectedTier === SubscriptionTier.MONTHLY}
          userBalance={pulseBalance}
          needsApproval={needsApproval && selectedTier === SubscriptionTier.MONTHLY}
          onApprove={handleApprove}
          isApproving={isApproving || isApproveConfirming}
        />
        <TierCard
          tier={SubscriptionTier.ANNUAL}
          name="Annual"
          price={tierPrices[SubscriptionTier.ANNUAL]}
          duration="365 days"
          isPopular
          isActive={subscription?.tier === SubscriptionTier.ANNUAL}
          onSubscribe={handleSubscribe}
          isProcessing={isProcessing && selectedTier === SubscriptionTier.ANNUAL}
          userBalance={pulseBalance}
          needsApproval={needsApproval && selectedTier === SubscriptionTier.ANNUAL}
          onApprove={handleApprove}
          isApproving={isApproving || isApproveConfirming}
        />
        <TierCard
          tier={SubscriptionTier.LIFETIME}
          name="Lifetime"
          price={tierPrices[SubscriptionTier.LIFETIME]}
          duration="Forever"
          isActive={subscription?.tier === SubscriptionTier.LIFETIME}
          onSubscribe={handleSubscribe}
          isProcessing={isProcessing && selectedTier === SubscriptionTier.LIFETIME}
          userBalance={pulseBalance}
          needsApproval={needsApproval && selectedTier === SubscriptionTier.LIFETIME}
          onApprove={handleApprove}
          isApproving={isApproving || isApproveConfirming}
        />
      </div>

      {/* Alternative: Staking */}
      <Separator />
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">
          Or unlock premium by staking 10,000+ PULSE tokens
        </p>
        <Button variant="outline" asChild>
          <a href="/staking">Learn about Staking</a>
        </Button>
      </div>

      {/* Success Dialog */}
      <SubscriptionSuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        tier={subscribedTier}
      />
    </div>
  )
}
