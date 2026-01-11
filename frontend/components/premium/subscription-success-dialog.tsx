"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PartyPopper, LayoutDashboard, Users, Home } from "lucide-react"
import { SubscriptionTier, TIER_NAMES } from "@/lib/contracts/premium-contract"

interface SubscriptionSuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tier: SubscriptionTier | null
}

const TIER_DURATIONS: Record<SubscriptionTier, string> = {
  [SubscriptionTier.NONE]: "",
  [SubscriptionTier.MONTHLY]: "30 days",
  [SubscriptionTier.ANNUAL]: "365 days",
  [SubscriptionTier.LIFETIME]: "Forever",
}

export function SubscriptionSuccessDialog({
  open,
  onOpenChange,
  tier,
}: SubscriptionSuccessDialogProps) {
  const [countdown, setCountdown] = useState(5)
  const router = useRouter()

  // Reset countdown when dialog opens
  useEffect(() => {
    if (open) {
      setCountdown(5)
    }
  }, [open])

  // Auto-redirect countdown
  useEffect(() => {
    if (!open) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push("/dapp")
          onOpenChange(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [open, router, onOpenChange])

  const handleNavigate = (path: string) => {
    onOpenChange(false)
    router.push(path)
  }

  const tierName = tier ? TIER_NAMES[tier] : "Premium"
  const tierDuration = tier ? TIER_DURATIONS[tier] : ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <PartyPopper className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <DialogTitle className="text-2xl">Congratulations!</DialogTitle>
          <DialogDescription className="text-base">
            You're now a Premium member!
            <br />
            <span className="font-medium text-foreground">
              {tierName} Subscription {tierDuration && `(${tierDuration})`}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground text-center mb-4">
            Where would you like to go?
          </p>

          <Card
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => handleNavigate("/creator")}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Creator Dashboard</p>
                <p className="text-sm text-muted-foreground">
                  Create polls, view analytics
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => handleNavigate("/participant")}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Participant Dashboard</p>
                <p className="text-sm text-muted-foreground">
                  Vote on polls, earn rewards
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => handleNavigate("/dapp")}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Home className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Main App</p>
                <p className="text-sm text-muted-foreground">
                  Explore all features
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Redirecting to Main App in{" "}
          <span className="font-medium text-foreground">{countdown}</span>{" "}
          seconds...
        </div>
      </DialogContent>
    </Dialog>
  )
}
