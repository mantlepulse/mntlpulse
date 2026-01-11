"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Users, Coins, Check, ArrowRight, Loader2, Copy, AlertTriangle, Info } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { sideshiftAPI, SideshiftPairInfo } from "@/lib/api/sideshift-client"

export interface FundingSource {
  coin: string        // e.g., "ETH", "BTC"
  network?: string    // e.g., "ethereum", "bitcoin"
  amount: string      // e.g., "0.01"
  detectedNetwork?: string  // Network detected from user's wallet
}

export interface ShiftState {
  shiftId?: string
  depositAddress?: string
  depositCoin?: string
  depositNetwork?: string
  status?: 'waiting' | 'processing' | 'settled' | 'expired'
  settledAmount?: string
  settledToken?: string
}

export interface PollPreviewData {
  question: string
  options: string[]
  duration?: number
  maxVoters?: number
  fundingAmount?: string
  fundingToken?: string
  // Funding fields
  hasFunding?: boolean
  useSideshift?: boolean  // true = SideShift flow, false/undefined = direct funding
  fundingSource?: FundingSource
}

interface PollPreviewCardProps {
  data: PollPreviewData
  onConfirm?: () => void
  onCreateShift?: () => void
  isCreating?: boolean
  isCreatingShift?: boolean
  shiftState?: ShiftState
  isOnTestnet?: boolean
}

export function PollPreviewCard({
  data,
  onConfirm,
  onCreateShift,
  isCreating,
  isCreatingShift,
  shiftState,
  isOnTestnet,
}: PollPreviewCardProps) {
  const [copied, setCopied] = useState(false)
  const [pairInfo, setPairInfo] = useState<SideshiftPairInfo | null>(null)
  const [loadingPairInfo, setLoadingPairInfo] = useState(false)
  const durationDays = data.duration ? Math.ceil(data.duration / 86400) : 7

  // Determine the current state
  const hasFunding = data.hasFunding && data.fundingSource
  const useSideshift = data.useSideshift === true  // Only true if explicitly set
  const shiftCreated = !!shiftState?.shiftId
  const shiftSettled = shiftState?.status === 'settled'
  const shiftWaiting = shiftState?.status === 'waiting'
  const shiftProcessing = shiftState?.status === 'processing'

  // Check if amount is below minimum
  const isBelowMinimum = pairInfo && data.fundingSource?.amount
    ? parseFloat(data.fundingSource.amount) < parseFloat(pairInfo.min)
    : false
  const isAboveMaximum = pairInfo && data.fundingSource?.amount
    ? parseFloat(data.fundingSource.amount) > parseFloat(pairInfo.max)
    : false

  // Fetch pair info when SideShift is used
  useEffect(() => {
    async function fetchPairInfo() {
      if (!useSideshift || !data.fundingSource?.coin || isOnTestnet) return

      setLoadingPairInfo(true)
      try {
        // Destination is always ETH on Base for poll funding
        const info = await sideshiftAPI.getPairInfo(
          data.fundingSource.coin,
          'ETH',  // Settle in ETH on Base
          data.fundingSource.network,
          'base'
        )
        setPairInfo(info)
      } catch (error) {
        console.error('Failed to fetch pair info:', error)
        // Don't show error toast - this is optional enhancement
      } finally {
        setLoadingPairInfo(false)
      }
    }

    fetchPairInfo()
  }, [useSideshift, data.fundingSource?.coin, data.fundingSource?.network, isOnTestnet])

  const copyAddress = async () => {
    if (shiftState?.depositAddress) {
      await navigator.clipboard.writeText(shiftState.depositAddress)
      setCopied(true)
      toast.success("Address copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">Poll Preview</CardTitle>
          <Badge variant="outline" className="text-xs">
            Draft
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Question */}
        <div className="space-y-1">
          <p className="text-sm font-medium">{data.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {data.options.map((option, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded-md bg-background/50 text-sm"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {index + 1}
              </span>
              <span className="line-clamp-1">{option}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-1 p-2 rounded-md bg-background/50">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium">{durationDays}d</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Duration</p>
          </div>
          <div className="space-y-1 p-2 rounded-md bg-background/50">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium">
                {data.maxVoters || "Unlimited"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Max Voters</p>
          </div>
          <div className="space-y-1 p-2 rounded-md bg-background/50">
            <div className="flex items-center justify-center gap-1">
              <Coins className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium">
                {hasFunding
                  ? `${data.fundingSource!.amount} ${data.fundingSource!.coin}`
                  : data.fundingAmount
                    ? `$${data.fundingAmount}`
                    : "None"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Reward</p>
          </div>
        </div>

        {/* Funding indicator */}
        {hasFunding && !shiftCreated && (
          <div className="space-y-2 py-2">
            {useSideshift ? (
              // SideShift flow - show conversion info
              <>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span>{data.fundingSource!.amount} {data.fundingSource!.coin}</span>
                  {data.fundingSource!.detectedNetwork && (
                    <span className="text-[10px] text-muted-foreground/70">
                      ({data.fundingSource!.detectedNetwork})
                    </span>
                  )}
                  <ArrowRight className="h-3 w-3" />
                  <span>ETH on Base</span>
                </div>
                <p className="text-[10px] text-center text-muted-foreground/70">
                  Convert via SideShift
                </p>

                {/* Minimum/Maximum amount info */}
                {loadingPairInfo && (
                  <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Checking deposit limits...</span>
                  </div>
                )}

                {pairInfo && !loadingPairInfo && (
                  <div className="p-2 rounded-md bg-background/50 space-y-1">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                      <Info className="h-3 w-3" />
                      <span>
                        Deposit range: {pairInfo.min} - {pairInfo.max} {data.fundingSource!.coin}
                      </span>
                    </div>
                    <div className="text-[10px] text-center text-muted-foreground/70">
                      Rate: 1 {pairInfo.depositCoin} ≈ {parseFloat(pairInfo.rate).toFixed(6)} {pairInfo.settleCoin}
                    </div>
                  </div>
                )}

                {/* Warning if below minimum */}
                {isBelowMinimum && (
                  <div className="flex items-center gap-1 p-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-600">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span className="text-[10px]">
                      Amount is below minimum ({pairInfo!.min} {data.fundingSource!.coin}). Please increase the funding amount.
                    </span>
                  </div>
                )}

                {/* Warning if above maximum */}
                {isAboveMaximum && (
                  <div className="flex items-center gap-1 p-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-600">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span className="text-[10px]">
                      Amount exceeds maximum ({pairInfo!.max} {data.fundingSource!.coin}). Please reduce the funding amount.
                    </span>
                  </div>
                )}
              </>
            ) : (
              // Direct funding - show simple funding info
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Coins className="h-3 w-3" />
                <span>Fund with {data.fundingSource!.amount} {data.fundingSource!.coin} on Base</span>
              </div>
            )}
          </div>
        )}

        {/* Shift Status - When shift is created but not settled */}
        {shiftCreated && !shiftSettled && (
          <div className="space-y-2 p-3 rounded-md bg-secondary/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Shift Status</span>
              <Badge variant="outline" className={
                shiftWaiting
                  ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30"
                  : "bg-blue-500/20 text-blue-600 border-blue-500/30"
              }>
                {shiftWaiting ? "Awaiting Deposit" : "Processing"}
              </Badge>
            </div>
            {shiftState?.depositAddress && shiftWaiting && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">
                  Send {shiftState.depositCoin} to:
                </p>
                <div className="flex items-center gap-1 p-2 rounded bg-background/50">
                  <code className="flex-1 text-[10px] break-all font-mono">
                    {shiftState.depositAddress}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0"
                    onClick={copyAddress}
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shift Settled - Show settled amount */}
        {shiftSettled && (
          <div className="p-3 rounded-md bg-green-500/10 border border-green-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-green-600">Shift Complete</span>
              <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-500/30">
                Settled
              </Badge>
            </div>
            {shiftState?.settledAmount && (
              <p className="text-sm font-medium mt-1">
                Received: {shiftState.settledAmount} {shiftState.settledToken || "USDC"}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {/* No funding OR direct funding (not SideShift) - Show Create Poll */}
          {(!hasFunding || (hasFunding && !useSideshift && !shiftCreated)) && onConfirm && (
            <Button
              size="sm"
              className="flex-1"
              onClick={onConfirm}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Create Poll
                </>
              )}
            </Button>
          )}

          {/* SideShift funding, no shift yet - Show Create Shift or Testnet Warning */}
          {hasFunding && useSideshift && !shiftCreated && onCreateShift && (
            isOnTestnet ? (
              <div className="flex-1 flex flex-col items-center gap-1 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-center gap-1 text-yellow-600 text-xs font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Testnet Detected</span>
                </div>
                <p className="text-[10px] text-center text-muted-foreground">
                  SideShift is not available on testnets. Switch to a mainnet to use cross-chain funding.
                </p>
              </div>
            ) : (
              <Button
                size="sm"
                className="flex-1"
                onClick={onCreateShift}
                disabled={isCreatingShift || isBelowMinimum || isAboveMaximum || loadingPairInfo}
              >
                {isCreatingShift ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Creating Shift...
                  </>
                ) : loadingPairInfo ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Checking limits...
                  </>
                ) : (
                  <>
                    <Coins className="h-3 w-3 mr-1" />
                    Create Shift
                  </>
                )}
              </Button>
            )
          )}

          {/* Shift settled - Show Create Poll with Funding */}
          {shiftSettled && onConfirm && (
            <Button
              size="sm"
              className="flex-1"
              onClick={onConfirm}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Create Poll with Funding
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
