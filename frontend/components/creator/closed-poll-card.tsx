/**
 * Closed Poll Card Component
 * Card display for closed polls with withdraw funds functionality
 */

"use client"

import { useState } from "react"
import { Clock, Wallet, ExternalLink } from "lucide-react"
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
import type { CreatorPoll } from "@/hooks/use-creator-dashboard-data"

interface ClosedPollCardProps {
  poll: CreatorPoll
  chainId: number
  onWithdrawFunds: (pollId: bigint, recipient: string, tokens: string[]) => Promise<void>
}

export function ClosedPollCard({
  poll,
  chainId,
  onWithdrawFunds,
}: ClosedPollCardProps) {
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false)
  const [recipient, setRecipient] = useState("")
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  const endDate = new Date(poll.endTime * 1000)
  const now = new Date()
  const hasEnded = now >= endDate

  // Calculate funding amount
  const decimals = TOKEN_INFO[poll.fundingTokenSymbol || "ETH"]?.decimals || 18
  const fundingAmount = Number(poll.totalFundingAmount) / Math.pow(10, decimals)
  const hasFunds = fundingAmount > 0
  const canWithdraw = hasFunds && hasEnded

  // Get status badge
  const getStatusBadge = () => {
    if (poll.status === 'for_claiming') {
      return <Badge variant="default" className="bg-amber-500">Pending Claims</Badge>
    }
    return <Badge variant="secondary">Closed</Badge>
  }

  const handleWithdraw = async () => {
    if (!recipient) return

    setIsWithdrawing(true)
    try {
      // Use the funding token address
      // For ETH, fundingToken is address(0) = "0x0000000000000000000000000000000000000000"
      // We always need to pass the token in the array
      const zeroAddress = "0x0000000000000000000000000000000000000000"
      const tokenToWithdraw = poll.fundingToken || zeroAddress
      await onWithdrawFunds(BigInt(poll.pollId), recipient, [tokenToWithdraw])
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
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1 h-8" asChild>
              <Link href={`/dapp/poll/${poll.pollId}`}>
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                View Results
              </Link>
            </Button>
            {hasFunds && (
              <Button
                variant={canWithdraw ? "default" : "secondary"}
                size="sm"
                className="flex-1 h-8"
                onClick={() => setIsWithdrawDialogOpen(true)}
                disabled={!canWithdraw}
                title={!hasEnded ? `Withdrawal available after ${endDate.toLocaleString()}` : undefined}
              >
                <Wallet className="h-3.5 w-3.5 mr-2" />
                {canWithdraw ? "Withdraw Funds" : "Locked"}
              </Button>
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
    </>
  )
}
