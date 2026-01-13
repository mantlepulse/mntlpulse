/**
 * Closed Poll Card Component
 * Card display for closed polls with withdraw funds functionality
 */

"use client"

import { useState } from "react"
import { Clock, Wallet, ExternalLink, Gift, Timer, ChevronDown, ChevronUp, Info, Lock } from "lucide-react"
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
  const { data: fundingBreakdown, isLoading: isBreakdownLoading, refetch: refetchBreakdown } = usePollFundingBreakdown(poll.pollId)

  const endDate = new Date(poll.endTime * 1000)
  const now = new Date()
  const hasEnded = now >= endDate

  // Calculate funding amount
  const decimals = TOKEN_INFO[poll.fundingTokenSymbol || "PULSE"]?.decimals || 18
  const fundingAmount = Number(poll.totalFundingAmount) / Math.pow(10, decimals)
  const hasFunds = fundingAmount > 0

  // Parse funding breakdown first so we can use claimPeriodExpired
  // Note: This is moved up so we can use it in canWithdraw calculation
  const breakdown = fundingBreakdown ? {
    totalFunded: Number(fundingBreakdown[0]) / Math.pow(10, decimals),
    expectedDistribution: Number(fundingBreakdown[1]) / Math.pow(10, decimals),
    actualParticipants: Number(fundingBreakdown[2]),
    distributed: Number(fundingBreakdown[3]) / Math.pow(10, decimals),
    remaining: Number(fundingBreakdown[4]) / Math.pow(10, decimals),
    claimDeadline: fundingBreakdown[5] > 0n ? new Date(Number(fundingBreakdown[5]) * 1000) : null,
    claimPeriodExpired: fundingBreakdown[6],
    owedToVoters: Number(fundingBreakdown[7]) / Math.pow(10, decimals),
    withdrawableNow: Number(fundingBreakdown[8]) / Math.pow(10, decimals),
  } : null

  // Check if there are withdrawable funds (from live contract data)
  const hasWithdrawableFunds = breakdown ? breakdown.withdrawableNow > 0 : hasFunds

  // Can withdraw if: has withdrawable funds AND (poll has ended OR grace period has expired)
  const canWithdraw = hasWithdrawableFunds && (hasEnded || breakdown?.claimPeriodExpired)

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
      // Refetch breakdown after a delay to allow transaction to confirm
      setTimeout(() => refetchBreakdown(), 3000)
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
      // Refetch breakdown after a delay to allow transaction to confirm
      setTimeout(() => refetchBreakdown(), 3000)
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
                    {fundingAmount.toFixed(4)} {poll.fundingTokenSymbol || "PULSE"}
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
                      <div className="font-medium">{breakdown.totalFunded.toFixed(4)} {poll.fundingTokenSymbol || "PULSE"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Expected Distribution</div>
                      <div className="font-medium">{breakdown.expectedDistribution.toFixed(4)} {poll.fundingTokenSymbol || "PULSE"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Actual Participants</div>
                      <div className="font-medium">{breakdown.actualParticipants}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Distributed</div>
                      <div className="font-medium">{breakdown.distributed.toFixed(4)} {poll.fundingTokenSymbol || "PULSE"}</div>
                    </div>
                  </div>

                  {/* Available vs Locked Breakdown */}
                  <div className="space-y-2 pt-2 border-t">
                    {breakdown.owedToVoters > 0 && !breakdown.claimPeriodExpired && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2 flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                          <Lock className="h-3.5 w-3.5" />
                          Locked for Voters
                        </span>
                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                          {breakdown.owedToVoters.toFixed(4)} {poll.fundingTokenSymbol || "PULSE"}
                        </span>
                      </div>
                    )}
                    <div className="bg-green-500/10 border border-green-500/20 rounded p-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        {breakdown.claimPeriodExpired ? "Total Withdrawable" : "Available Now"}
                      </span>
                      <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                        {breakdown.withdrawableNow.toFixed(4)} {poll.fundingTokenSymbol || "PULSE"}
                      </span>
                    </div>
                    {breakdown.owedToVoters > 0 && !breakdown.claimPeriodExpired && (
                      <p className="text-xs text-muted-foreground">
                        {breakdown.owedToVoters.toFixed(2)} {poll.fundingTokenSymbol || "PULSE"} is reserved for {breakdown.actualParticipants} voter{breakdown.actualParticipants !== 1 ? 's' : ''} until the grace period expires.
                      </p>
                    )}
                  </div>

                  {/* Claim Deadline */}
                  {breakdown.claimDeadline && (
                    <div className="flex items-center gap-2 text-xs">
                      <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                      {breakdown.claimPeriodExpired ? (
                        <span className="text-red-500">Grace period expired - all funds available</span>
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
            {canWithdraw && breakdown && breakdown.remaining > 0 && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  className="h-8"
                  onClick={() => setIsWithdrawDialogOpen(true)}
                >
                  <Wallet className="h-3.5 w-3.5 mr-2" />
                  Withdraw
                </Button>
                {onDonateToTreasury && (
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
              </>
            )}
            {hasFunds && onSetClaimDeadline && !breakdown?.claimDeadline && (hasEnded || breakdown?.claimPeriodExpired) && (
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
          </div>
          {breakdown && breakdown.remaining > 0 && !hasEnded && !breakdown?.claimPeriodExpired && (
            <p className="text-xs text-muted-foreground text-center">
              Funds unlock on {endDate.toLocaleDateString()} at {endDate.toLocaleTimeString()}
            </p>
          )}
          {breakdown?.claimPeriodExpired && breakdown.remaining > 0 && (
            <p className="text-xs text-green-600 text-center">
              Grace period expired - funds available for withdrawal
            </p>
          )}
          {breakdown && breakdown.remaining === 0 && hasFunds && (
            <p className="text-xs text-muted-foreground text-center">
              All funds have been withdrawn or donated
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
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div>
                <div className="text-sm text-muted-foreground">Amount to Withdraw</div>
                <div className="text-lg font-semibold text-green-600">
                  {breakdown?.withdrawableNow.toFixed(4) || fundingAmount.toFixed(4)} {poll.fundingTokenSymbol || "PULSE"}
                </div>
              </div>
              {breakdown && breakdown.owedToVoters > 0 && !breakdown.claimPeriodExpired && (
                <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  {breakdown.owedToVoters.toFixed(4)} {poll.fundingTokenSymbol || "PULSE"} is locked for voters until grace period expires
                </div>
              )}
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
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div>
                <div className="text-sm text-muted-foreground">Amount to Donate</div>
                <div className="text-lg font-semibold text-green-600">
                  {breakdown?.withdrawableNow.toFixed(4) || fundingAmount.toFixed(4)} {poll.fundingTokenSymbol || "PULSE"}
                </div>
              </div>
              {breakdown && breakdown.owedToVoters > 0 && !breakdown.claimPeriodExpired && (
                <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  {breakdown.owedToVoters.toFixed(4)} {poll.fundingTokenSymbol || "PULSE"} is locked for voters until grace period expires
                </div>
              )}
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
