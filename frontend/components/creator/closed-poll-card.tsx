/**
 * Closed Poll Card Component
 * Card display for closed polls with withdraw funds functionality
 */

"use client"

import { useState } from "react"
import { Clock, Wallet, ExternalLink, Gift, Timer, ChevronDown, ChevronUp, Info } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { TOKEN_INFO } from "@/lib/contracts/token-config"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { CreatorPoll } from "@/hooks/use-creator-dashboard-data"
import { usePollFundingBreakdown } from "@/lib/contracts/polls-contract-utils"

interface ClosedPollCardProps {
  poll: CreatorPoll
  chainId: number
  onWithdrawFunds: (pollId: bigint, recipient: string, tokens: string[]) => Promise<void>
  onDonateToTreasury?: (pollId: bigint, tokens: string[]) => Promise<void>
  onSetClaimDeadline?: (pollId: bigint, deadline: bigint) => Promise<void>
}

export function ClosedPollCard({
  poll,
  chainId,
  onWithdrawFunds,
  onDonateToTreasury,
  onSetClaimDeadline,
}: ClosedPollCardProps) {
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false)
  const [isDonateDialogOpen, setIsDonateDialogOpen] = useState(false)
  const [isGracePeriodDialogOpen, setIsGracePeriodDialogOpen] = useState(false)
  const [recipient, setRecipient] = useState("")
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [isDonating, setIsDonating] = useState(false)
  const [isSettingGracePeriod, setIsSettingGracePeriod] = useState(false)
  const [gracePeriodDays, setGracePeriodDays] = useState(30)
  const [showBreakdown, setShowBreakdown] = useState(false)

  // Fetch funding breakdown from contract
  const { data: fundingBreakdown, isLoading: isBreakdownLoading } = usePollFundingBreakdown(poll.pollId)

  const endDate = new Date(poll.endTime * 1000)
  const now = new Date()
  const hasEnded = now >= endDate

  // Calculate funding amount
  const decimals = TOKEN_INFO[poll.fundingTokenSymbol || "ETH"]?.decimals || 18
  const fundingAmount = Number(poll.totalFundingAmount) / Math.pow(10, decimals)
  const hasFunds = fundingAmount > 0
  const canWithdraw = hasFunds && hasEnded

  // Parse funding breakdown
  const breakdown = fundingBreakdown ? {
    totalFunded: Number(fundingBreakdown.totalFunded) / Math.pow(10, decimals),
    expectedDistribution: Number(fundingBreakdown.expectedDistribution) / Math.pow(10, decimals),
    actualParticipants: Number(fundingBreakdown.actualParticipants),
    distributed: Number(fundingBreakdown.distributed) / Math.pow(10, decimals),
    remaining: Number(fundingBreakdown.remaining) / Math.pow(10, decimals),
    claimDeadline: fundingBreakdown.claimDeadline > 0n ? new Date(Number(fundingBreakdown.claimDeadline) * 1000) : null,
    claimPeriodExpired: fundingBreakdown.claimPeriodExpired,
  } : null

  // Calculate distribution progress percentage
  const distributionProgress = breakdown && breakdown.expectedDistribution > 0
    ? Math.min(100, (breakdown.distributed / breakdown.expectedDistribution) * 100)
    : 0

  // Get status badge
  const getStatusBadge = () => {
    if (breakdown?.claimPeriodExpired) {
      return <Badge variant="destructive">Grace Period Expired</Badge>
    }
    if (poll.status === 'for_claiming') {
      return <Badge variant="default" className="bg-amber-500">Pending Claims</Badge>
    }
    return <Badge variant="secondary">Closed</Badge>
  }

  // Get zero address for token operations
  const zeroAddress = "0x0000000000000000000000000000000000000000"
  const tokenToUse = poll.fundingToken || zeroAddress

  const handleDonateToTreasury = async () => {
    if (!onDonateToTreasury) return
    setIsDonating(true)
    try {
      await onDonateToTreasury(BigInt(poll.pollId), [tokenToUse])
      setIsDonateDialogOpen(false)
    } catch (error) {
      console.error("Donate to treasury failed:", error)
    } finally {
      setIsDonating(false)
    }
  }

  const handleSetGracePeriod = async () => {
    if (!onSetClaimDeadline) return
    setIsSettingGracePeriod(true)
    try {
      // Calculate deadline timestamp (current time + days in seconds)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + gracePeriodDays * 24 * 60 * 60)
      await onSetClaimDeadline(BigInt(poll.pollId), deadline)
      setIsGracePeriodDialogOpen(false)
    } catch (error) {
      console.error("Set grace period failed:", error)
    } finally {
      setIsSettingGracePeriod(false)
    }
  }

  const handleWithdraw = async () => {
    if (!recipient) return

    setIsWithdrawing(true)
    try {
      await onWithdrawFunds(BigInt(poll.pollId), recipient, [tokenToUse])
      setIsWithdrawDialogOpen(false)
      setRecipient("")
    } catch (error) {
      console.error("Withdraw failed:", error)
    } finally {
      setIsWithdrawing(false)
    }
  }

  return (
    <>
      <Card className="relative opacity-90 hover:opacity-100 transition-opacity">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base leading-tight">
                <Link
                  href={`/dapp/poll/${poll.pollId}`}
                  className="hover:text-primary transition-colors line-clamp-2"
                >
                  {poll.question}
                </Link>
              </CardTitle>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {getStatusBadge()}
                {hasFunds ? (
                  <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                    {fundingAmount.toFixed(4)} {poll.fundingTokenSymbol || "ETH"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    No Funds
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2 space-y-3">
          {/* Stats Row */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span>
                <span className="font-semibold">{poll.voteCount}</span>
                <span className="text-muted-foreground ml-1">votes</span>
              </span>
              <span>
                <span className="font-semibold">{poll.options.length}</span>
                <span className="text-muted-foreground ml-1">options</span>
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Ended {endDate.toLocaleDateString()}</span>
            </div>
          </div>

          {/* Funding Breakdown Section */}
          {hasFunds && breakdown && (
            <div className="border rounded-lg p-3 space-y-2">
              <button
                className="w-full flex items-center justify-between text-sm font-medium"
                onClick={() => setShowBreakdown(!showBreakdown)}
              >
                <span className="flex items-center gap-2">
                  Funding Summary
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Breakdown of poll funds and distribution</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
                {showBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showBreakdown && (
                <div className="space-y-3 pt-2">
                  {/* Distribution Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Distribution Progress</span>
                      <span>{distributionProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={distributionProgress} className="h-2" />
                  </div>

                  {/* Breakdown Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Total Funded</div>
                      <div className="font-medium">{breakdown.totalFunded.toFixed(4)} {poll.fundingTokenSymbol || "ETH"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Expected Distribution</div>
                      <div className="font-medium">{breakdown.expectedDistribution.toFixed(4)} {poll.fundingTokenSymbol || "ETH"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Actual Participants</div>
                      <div className="font-medium">{breakdown.actualParticipants}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Distributed</div>
                      <div className="font-medium">{breakdown.distributed.toFixed(4)} {poll.fundingTokenSymbol || "ETH"}</div>
                    </div>
                  </div>

                  {/* Refundable Highlight */}
                  <div className="bg-muted/50 rounded p-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Refundable</span>
                    <span className="text-sm font-semibold text-green-600">
                      {breakdown.remaining.toFixed(4)} {poll.fundingTokenSymbol || "ETH"}
                    </span>
                  </div>

                  {/* Claim Deadline */}
                  {breakdown.claimDeadline && (
                    <div className="flex items-center gap-2 text-xs">
                      <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                      {breakdown.claimPeriodExpired ? (
                        <span className="text-red-500">Grace period expired</span>
                      ) : (
                        <span className="text-muted-foreground">
                          Claim deadline: {breakdown.claimDeadline.toLocaleDateString()} at {breakdown.claimDeadline.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Info Row */}
          <div className="flex items-center justify-between text-sm border-t pt-2">
            <div className="text-muted-foreground">
              Poll #{poll.pollId}
            </div>
            <div className="text-muted-foreground">
              {poll.fundingType === 'self' ? 'Self-funded' : 'Community-funded'}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href={`/dapp/poll/${poll.pollId}`}>
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                View
              </Link>
            </Button>
            {hasFunds && (
              <>
                <Button
                  variant={canWithdraw ? "default" : "secondary"}
                  size="sm"
                  className="h-8"
                  onClick={() => setIsWithdrawDialogOpen(true)}
                  disabled={!canWithdraw}
                  title={!hasEnded ? `Withdrawal available after ${endDate.toLocaleString()}` : undefined}
                >
                  <Wallet className="h-3.5 w-3.5 mr-2" />
                  Withdraw
                </Button>
                {onDonateToTreasury && canWithdraw && breakdown && breakdown.remaining > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8"
                    onClick={() => setIsDonateDialogOpen(true)}
                  >
                    <Gift className="h-3.5 w-3.5 mr-2" />
                    Donate
                  </Button>
                )}
                {onSetClaimDeadline && canWithdraw && !breakdown?.claimDeadline && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setIsGracePeriodDialogOpen(true)}
                  >
                    <Timer className="h-3.5 w-3.5 mr-2" />
                    Set Grace Period
                  </Button>
                )}
              </>
            )}
          </div>
          {hasFunds && !hasEnded && (
            <p className="text-xs text-muted-foreground text-center">
              Funds unlock on {endDate.toLocaleDateString()} at {endDate.toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Withdraw Funds Dialog */}
      <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Withdraw remaining funds from this closed poll to your wallet or another address.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Available Balance</div>
              <div className="text-lg font-semibold">
                {fundingAmount.toFixed(4)} {poll.fundingTokenSymbol || "ETH"}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the wallet address to receive the funds
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsWithdrawDialogOpen(false)}
              disabled={isWithdrawing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={!recipient || isWithdrawing}
            >
              {isWithdrawing ? "Withdrawing..." : "Withdraw"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Donate to Treasury Dialog */}
      <Dialog open={isDonateDialogOpen} onOpenChange={setIsDonateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Donate to Community Treasury</DialogTitle>
            <DialogDescription>
              Donate remaining poll funds to the community treasury to support the platform.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Amount to Donate</div>
              <div className="text-lg font-semibold text-green-600">
                {breakdown?.remaining.toFixed(4) || fundingAmount.toFixed(4)} {poll.fundingTokenSymbol || "ETH"}
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                This action is irreversible. The funds will be transferred to the platform treasury and cannot be recovered.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDonateDialogOpen(false)}
              disabled={isDonating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDonateToTreasury}
              disabled={isDonating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isDonating ? "Donating..." : "Confirm Donation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Grace Period Dialog */}
      <Dialog open={isGracePeriodDialogOpen} onOpenChange={setIsGracePeriodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Claim Grace Period</DialogTitle>
            <DialogDescription>
              Set a deadline for participants to claim their rewards. After this deadline, you can withdraw any unclaimed funds.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Select Grace Period</Label>
              <div className="grid grid-cols-3 gap-2">
                {[7, 14, 30].map((days) => (
                  <Button
                    key={days}
                    variant={gracePeriodDays === days ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGracePeriodDays(days)}
                  >
                    {days} days
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Label htmlFor="custom-days" className="whitespace-nowrap">Custom:</Label>
                <Input
                  id="custom-days"
                  type="number"
                  min={1}
                  max={365}
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 30)))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Deadline will be set to</div>
              <div className="text-sm font-medium">
                {new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000).toLocaleDateString()} at{' '}
                {new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000).toLocaleTimeString()}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsGracePeriodDialogOpen(false)}
              disabled={isSettingGracePeriod}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSetGracePeriod}
              disabled={isSettingGracePeriod}
            >
              {isSettingGracePeriod ? "Setting..." : "Set Grace Period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
