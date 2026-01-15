/**
 * Reward Card Component
 * Card-based display for claimable rewards from participant's perspective
 */

"use client"

import { useState } from "react"
import { Clock, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { formatEther } from "viem"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClaimRewardsDialog } from "@/components/sideshift/claim-rewards-dialog"

interface RewardCardProps {
  poll: {
    id: bigint
    question: string
    isActive: boolean
    endTime: bigint
    totalFunding: bigint
    claimableAmount: string // In token units
    totalParticipants: number
    tokenSymbol?: string
    tokenDecimals?: number
  }
}

export function RewardCard({ poll }: RewardCardProps) {
  const [showClaimDialog, setShowClaimDialog] = useState(false)
  const endDate = new Date(Number(poll.endTime) * 1000)
  const tokenSymbol = poll.tokenSymbol || 'PULSE'
  const now = new Date()
  const isExpired = endDate < now
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isExpiringSoon = daysLeft <= 7 && daysLeft > 0

  // Get status
  const getStatus = () => {
    if (poll.isActive && !isExpired) return "Active"
    if (!poll.isActive) return "Ended"
    if (isExpired) return "Expired"
    return "Claimable"
  }

  const status = getStatus()
  const canClaim = !poll.isActive || isExpired

  return (
    <>
      <Card className={cn(
        "relative",
        isExpiringSoon && "border-warning"
      )}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-3">
                <Link
                  href={`/dapp/poll/${poll.id}`}
                  className="hover:text-primary transition-colors"
                >
                  {poll.question}
                </Link>
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    status === "Active" ? "default" :
                    status === "Claimable" ? "secondary" :
                    "outline"
                  }
                >
                  {status}
                </Badge>
                {isExpiringSoon && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Expires in {daysLeft} days
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Reward Amount */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="text-sm text-muted-foreground mb-1">Your Reward</div>
            <div className="text-3xl font-bold text-primary">
              {poll.claimableAmount} {tokenSymbol}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 text-center py-2">
            <div>
              <div className="text-2xl font-bold">{poll.totalParticipants}</div>
              <div className="text-sm text-muted-foreground">Participants</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {Number(formatEther(poll.totalFunding)).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Total Pool ({tokenSymbol})</div>
            </div>
          </div>

          {/* Time Info */}
          {poll.isActive && !isExpired && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Poll ends {endDate.toLocaleDateString()}</span>
            </div>
          )}

          {/* Expiration Date */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Poll ID</span>
              <span>#{Number(poll.id)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expires</span>
              <span className={isExpiringSoon ? "text-warning font-medium" : ""}>
                {endDate.toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="default"
              size="sm"
              disabled={!canClaim}
              onClick={() => setShowClaimDialog(true)}
              className="flex-1"
            >
              Claim Reward
            </Button>
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link href={`/dapp/poll/${poll.id}`}>View Poll</Link>
            </Button>
          </div>

          {!canClaim && (
            <p className="text-xs text-muted-foreground italic text-center">
              Rewards can be claimed after poll ends
            </p>
          )}
        </CardContent>
      </Card>

      {/* Claim Dialog */}
      {showClaimDialog && (
        <ClaimRewardsDialog
          pollId={poll.id}
          estimatedReward={poll.claimableAmount}
          onClose={() => setShowClaimDialog(false)}
        />
      )}
    </>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
