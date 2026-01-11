"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Loader2, Coins, Zap } from "lucide-react"
import { formatEther, Address } from "viem"
import { useAccount } from "wagmi"
import { toast } from "sonner"
import {
  useBuyVotes,
  usePollsContractAddress,
  useTokenAllowance,
  useTokenApproval,
  calculateQuadraticCostLocal,
  useUserVotesInPoll,
} from "@/lib/contracts/polls-contract-utils"
import { usePulseBalance, usePulseTokenAddress } from "@/lib/contracts/premium-contract-utils"

interface QuickVoteDialogProps {
  pollId: number
  options: Array<{
    id: string
    text: string
    votes: number
  }>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function QuickVoteDialog({
  pollId,
  options,
  open,
  onOpenChange,
  onSuccess
}: QuickVoteDialogProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [hasStartedVoting, setHasStartedVoting] = useState(false)

  const { address } = useAccount()
  const contractAddress = usePollsContractAddress()
  const pulseToken = usePulseTokenAddress()

  // Get user's current votes in this poll
  const { data: currentVotes } = useUserVotesInPoll(pollId, address)

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
  } = useTokenApproval()

  // Calculate cost for 1 vote
  const currentVotesNum = currentVotes ? Number(currentVotes) : 0
  const voteCost = calculateQuadraticCostLocal(currentVotesNum, 1)

  // Check if user has sufficient balance and allowance
  const hasSufficientBalance = pulseBalance && pulseBalance >= voteCost
  const hasSufficientAllowance = allowance && allowance >= voteCost
  const needsApproval = !hasSufficientAllowance

  // Handle successful vote
  useEffect(() => {
    if (isSuccess && hasStartedVoting) {
      toast.success("Vote purchased successfully!")
      refetchBalance()
      onSuccess?.()
      // Close dialog after success
      onOpenChange(false)
      setSelectedOption(null)
      setHasStartedVoting(false)
    }
  }, [isSuccess, hasStartedVoting, refetchBalance, onSuccess, onOpenChange])

  // Handle successful approval
  useEffect(() => {
    if (isApproveSuccess) {
      toast.success("PULSE approved! Click Buy Vote again.")
      refetchAllowance()
    }
  }, [isApproveSuccess, refetchAllowance])

  // Handle errors
  useEffect(() => {
    if (buyError) {
      toast.error(`Failed to purchase vote: ${buyError.message}`)
      setHasStartedVoting(false)
    }
  }, [buyError])

  const handleApprove = async () => {
    if (!pulseToken || !contractAddress) {
      toast.error("PULSE token or contract address not found")
      return
    }
    try {
      // Approve a large amount to avoid repeated approvals
      const approvalAmount = voteCost * BigInt(10)
      console.log('[Quick Vote Approve] Vote cost:', formatEther(voteCost), 'PULSE')
      console.log('[Quick Vote Approve] Approval amount:', formatEther(approvalAmount), 'PULSE')
      console.log('[Quick Vote Approve] Pulse token:', pulseToken)
      console.log('[Quick Vote Approve] Spender (contract):', contractAddress)
      await approve(pulseToken, contractAddress, formatEther(approvalAmount), 18)
    } catch (error) {
      console.error("Approval error:", error)
    }
  }

  const handleBuyVote = async () => {
    if (selectedOption === null) {
      toast.error("Please select an option to vote for")
      return
    }

    if (!hasSufficientBalance) {
      toast.error("Insufficient PULSE balance")
      return
    }

    console.log('[Quick Vote Buy] Poll ID:', pollId)
    console.log('[Quick Vote Buy] Option Index:', selectedOption)
    console.log('[Quick Vote Buy] Current Votes:', currentVotesNum)
    console.log('[Quick Vote Buy] Vote Cost:', formatEther(voteCost), 'PULSE')
    console.log('[Quick Vote Buy] Balance:', pulseBalance ? formatEther(pulseBalance) : '0', 'PULSE')
    console.log('[Quick Vote Buy] Allowance:', allowance ? formatEther(allowance) : '0', 'PULSE')
    console.log('[Quick Vote Buy] Needs Approval:', needsApproval)

    try {
      setHasStartedVoting(true)
      await buyVotes(pollId, selectedOption, 1)
    } catch (error) {
      console.error("Buy vote error:", error)
      setHasStartedVoting(false)
    }
  }

  const isProcessing = isBuying || isConfirming || isApprovePending || isApproveConfirming

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!isProcessing) {
      onOpenChange(newOpen)
      if (!newOpen) {
        setSelectedOption(null)
        setHasStartedVoting(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Vote
          </DialogTitle>
          <DialogDescription>
            Buy 1 vote for your chosen option
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
            <div>
              <p className="text-muted-foreground">Your votes in this poll</p>
              <p className="font-semibold">{currentVotesNum}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">PULSE Balance</p>
              <p className="font-semibold">
                {pulseBalance ? Number(formatEther(pulseBalance)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}
              </p>
            </div>
          </div>

          {/* Cost Display */}
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cost for 1 vote</span>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                <span className="text-lg font-bold text-primary">
                  {Number(formatEther(voteCost)).toLocaleString(undefined, { maximumFractionDigits: 0 })} PULSE
                </span>
              </div>
            </div>
          </div>

          {/* Option Selection */}
          <div className="space-y-3">
            <Label>Select Option</Label>
            <RadioGroup
              value={selectedOption?.toString()}
              onValueChange={(value) => setSelectedOption(parseInt(value))}
              disabled={isProcessing}
            >
              {options.map((option, index) => (
                <div
                  key={option.id}
                  className={`flex items-center space-x-2 p-3 border rounded-lg ${
                    isProcessing ? 'opacity-50' : ''
                  }`}
                >
                  <RadioGroupItem
                    value={index.toString()}
                    id={`option-${index}`}
                    disabled={isProcessing}
                  />
                  <Label
                    htmlFor={`option-${index}`}
                    className={`flex-1 ${isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{option.text}</span>
                      <Badge variant="secondary">{option.votes} votes</Badge>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Warnings */}
          {!hasSufficientBalance && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Insufficient Balance</p>
                <p className="text-muted-foreground">
                  You need {Number(formatEther(voteCost)).toLocaleString()} PULSE
                </p>
              </div>
            </div>
          )}

          {/* Status messages */}
          {isApprovePending && (
            <div className="p-3 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Please confirm approval in your wallet...</span>
            </div>
          )}
          {isApproveConfirming && (
            <div className="p-3 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Approval confirming on-chain...</span>
            </div>
          )}
          {isBuying && (
            <div className="p-3 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Please confirm purchase in your wallet...</span>
            </div>
          )}
          {isConfirming && (
            <div className="p-3 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Transaction confirming on-chain...</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          {needsApproval ? (
            <Button
              onClick={handleApprove}
              disabled={isProcessing || !hasSufficientBalance}
            >
              {isApprovePending || isApproveConfirming ? (
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
              onClick={handleBuyVote}
              disabled={isProcessing || selectedOption === null || !hasSufficientBalance}
            >
              {isBuying || isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Buy 1 Vote
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
