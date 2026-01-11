"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import {
  Coins,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info
} from "lucide-react"
import { formatEther, Address } from "viem"
import { useAccount } from "wagmi"
import { toast } from "sonner"
import {
  useBuyVotes,
  useUserVotesInPoll,
  usePollsContractAddress,
  useTokenAllowance,
  useTokenApproval,
  calculateQuadraticCostLocal,
} from "@/lib/contracts/polls-contract-utils"
import { usePulseBalance, usePulseTokenAddress } from "@/lib/contracts/premium-contract-utils"
import { useQuadraticVotingDiagnostics } from "@/lib/contracts/quadratic-voting-diagnostics"

interface QuadraticVotePanelProps {
  pollId: number
  options: string[]
  votes: bigint[]
  onVoteSuccess?: () => void
}

export function QuadraticVotePanel({
  pollId,
  options,
  votes,
  onVoteSuccess
}: QuadraticVotePanelProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [numVotes, setNumVotes] = useState(1)
  const [isApproving, setIsApproving] = useState(false)

  const { address } = useAccount()
  const contractAddress = usePollsContractAddress()
  const pulseToken = usePulseTokenAddress()

  // Diagnostic check for quadratic voting setup
  const { isReady: qvReady, issues: qvIssues } = useQuadraticVotingDiagnostics()

  // Get user's current votes in this poll
  const { data: currentVotes, refetch: refetchVotes } = useUserVotesInPoll(pollId, address)

  // Get user's PULSE balance
  const { data: pulseBalance, refetch: refetchBalance } = usePulseBalance(address)

  // Get current allowance
  const { data: allowance, refetch: refetchAllowance } = useTokenAllowance(
    pulseToken,
    address,
    contractAddress
  )

  // Buy votes hook
  const {
    buyVotes,
    isPending: isBuying,
    isConfirming,
    isSuccess,
    error: buyError
  } = useBuyVotes()

  // Token approval hook
  const {
    approve,
    isPending: isApprovePending,
    isConfirming: isApproveConfirming,
    isSuccess: isApproveSuccess,
    error: approveError,
  } = useTokenApproval()

  // Calculate cost based on current votes + additional votes
  const currentVotesNum = currentVotes ? Number(currentVotes) : 0
  const estimatedCost = useMemo(() => {
    return calculateQuadraticCostLocal(currentVotesNum, numVotes)
  }, [currentVotesNum, numVotes])

  // Check if user has sufficient balance and allowance
  const hasSufficientBalance = pulseBalance && pulseBalance >= estimatedCost
  const hasSufficientAllowance = allowance && allowance >= estimatedCost
  const needsApproval = !hasSufficientAllowance

  // Handle successful vote
  useEffect(() => {
    if (isSuccess) {
      toast.success(`Successfully purchased ${numVotes} vote${numVotes > 1 ? 's' : ''}!`)
      refetchVotes()
      refetchBalance()
      setNumVotes(1)
      setSelectedOption(null)
      onVoteSuccess?.()
    }
  }, [isSuccess, numVotes, refetchVotes, refetchBalance, onVoteSuccess])

  // Handle successful approval
  useEffect(() => {
    if (isApproveSuccess) {
      toast.success("PULSE approved! You can now purchase votes.")
      refetchAllowance()
      setIsApproving(false)
    }
  }, [isApproveSuccess, refetchAllowance])

  // Handle errors
  useEffect(() => {
    if (buyError) {
      toast.error(`Failed to purchase votes: ${buyError.message}`)
    }
    if (approveError) {
      toast.error(`Failed to approve: ${approveError.message}`)
      setIsApproving(false)
    }
  }, [buyError, approveError])

  const handleApprove = async () => {
    if (!pulseToken || !contractAddress) {
      toast.error("PULSE token or contract address not found")
      return
    }
    setIsApproving(true)
    try {
      // Approve a large amount to avoid repeated approvals
      const approvalAmount = estimatedCost * BigInt(10)
      console.log('[QV Approve] Estimated cost:', formatEther(estimatedCost), 'PULSE')
      console.log('[QV Approve] Approval amount:', formatEther(approvalAmount), 'PULSE')
      console.log('[QV Approve] Pulse token:', pulseToken)
      console.log('[QV Approve] Spender (contract):', contractAddress)
      await approve(pulseToken, contractAddress, formatEther(approvalAmount), 18)
    } catch (error) {
      console.error("Approval error:", error)
      setIsApproving(false)
    }
  }

  const handleBuyVotes = async () => {
    if (selectedOption === null) {
      toast.error("Please select an option to vote for")
      return
    }

    if (!hasSufficientBalance) {
      toast.error("Insufficient PULSE balance")
      return
    }

    console.log('[QV Buy] Poll ID:', pollId)
    console.log('[QV Buy] Option Index:', selectedOption)
    console.log('[QV Buy] Number of Votes:', numVotes)
    console.log('[QV Buy] Current Votes:', currentVotesNum)
    console.log('[QV Buy] Estimated Cost:', formatEther(estimatedCost), 'PULSE')
    console.log('[QV Buy] Balance:', pulseBalance ? formatEther(pulseBalance) : '0', 'PULSE')
    console.log('[QV Buy] Allowance:', allowance ? formatEther(allowance) : '0', 'PULSE')
    console.log('[QV Buy] Needs Approval:', needsApproval)

    try {
      await buyVotes(pollId, selectedOption, numVotes)
    } catch (error) {
      console.error("Buy votes error:", error)
    }
  }

  const isProcessing = isBuying || isConfirming || isApprovePending || isApproveConfirming

  // Calculate cost breakdown for display
  const costBreakdown = useMemo(() => {
    const breakdown = []
    for (let i = 1; i <= Math.min(numVotes, 5); i++) {
      const voteNum = currentVotesNum + i
      breakdown.push({
        voteNumber: voteNum,
        cost: voteNum * voteNum,
      })
    }
    if (numVotes > 5) {
      breakdown.push({ voteNumber: -1, cost: -1 }) // Indicator for "..."
    }
    return breakdown
  }, [currentVotesNum, numVotes])

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          Buy Votes
        </CardTitle>
        <CardDescription>
          Purchase votes using PULSE tokens. Cost increases quadratically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Your votes in this poll</p>
            <p className="text-2xl font-bold">{currentVotesNum}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-sm text-muted-foreground">PULSE Balance</p>
            <p className="text-lg font-semibold">
              {pulseBalance ? Number(formatEther(pulseBalance)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"}
            </p>
          </div>
        </div>

        {/* Option Selection */}
        <div className="space-y-3">
          <Label>Select Option to Vote For</Label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => setSelectedOption(index)}
                className={`w-full p-3 text-left rounded-lg border transition-colors ${
                  selectedOption === index
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option}</span>
                  <Badge variant="secondary">
                    {Number(votes[index])} vote{Number(votes[index]) !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Vote Amount Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Number of Votes to Purchase</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setNumVotes(Math.max(1, numVotes - 1))}
                disabled={numVotes <= 1}
              >
                -
              </Button>
              <Input
                type="number"
                min={1}
                max={100}
                value={numVotes}
                onChange={(e) => setNumVotes(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-20 text-center"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setNumVotes(Math.min(100, numVotes + 1))}
                disabled={numVotes >= 100}
              >
                +
              </Button>
            </div>
          </div>

          <Slider
            value={[numVotes]}
            onValueChange={([value]) => setNumVotes(value)}
            min={1}
            max={20}
            step={1}
            className="w-full"
          />
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Cost Breakdown</span>
          </div>
          <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground">
            {costBreakdown.map((item, idx) => (
              <div key={idx} className="text-center">
                {item.voteNumber === -1 ? (
                  <span>...</span>
                ) : (
                  <>
                    <div className="font-medium">Vote #{item.voteNumber}</div>
                    <div>{item.cost} PULSE</div>
                  </>
                )}
              </div>
            ))}
          </div>
          <Separator className="my-2" />
          <div className="flex items-center justify-between">
            <span className="font-medium">Total Cost</span>
            <span className="text-xl font-bold text-primary">
              {Number(formatEther(estimatedCost)).toLocaleString(undefined, { maximumFractionDigits: 2 })} PULSE
            </span>
          </div>
        </div>

        {/* Warnings */}
        {qvIssues.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-500">Configuration Issues</p>
              <ul className="text-muted-foreground mt-1 list-disc list-inside">
                {qvIssues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-2">
                Please contact the contract owner to configure quadratic voting settings.
              </p>
            </div>
          </div>
        )}

        {!hasSufficientBalance && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Insufficient Balance</p>
              <p className="text-muted-foreground">
                You need {Number(formatEther(estimatedCost)).toLocaleString()} PULSE but only have{" "}
                {pulseBalance ? Number(formatEther(pulseBalance)).toLocaleString() : "0"} PULSE
              </p>
            </div>
          </div>
        )}

        {/* Info about quadratic cost */}
        <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <Info className="h-4 w-4 text-primary mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p>
              Quadratic voting helps balance influence by making additional votes
              increasingly expensive. This encourages broader participation and
              prevents wealthy voters from dominating.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {needsApproval ? (
            <Button
              onClick={handleApprove}
              disabled={isProcessing || !hasSufficientBalance || !qvReady}
              className="flex-1"
            >
              {isApproving || isApprovePending || isApproveConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve PULSE
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleBuyVotes}
              disabled={isProcessing || selectedOption === null || !hasSufficientBalance || !qvReady}
              className="flex-1"
            >
              {isBuying || isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isBuying ? "Confirming..." : "Processing..."}
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4 mr-2" />
                  Buy {numVotes} Vote{numVotes > 1 ? 's' : ''} for{" "}
                  {Number(formatEther(estimatedCost)).toLocaleString(undefined, { maximumFractionDigits: 0 })} PULSE
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
