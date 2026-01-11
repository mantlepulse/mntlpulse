"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Vote, Clock, Users, Coins, Loader2 } from "lucide-react"
import { formatRewardDisplay } from "@/lib/utils/format-reward"

interface VoteDialogProps {
  poll: {
    id: string
    title: string
    description?: string
    creator?: string
    options: Array<{
      id: string
      text: string
      votes: number
      percentage: number
    }>
    totalVotes: number
    totalReward: number
    fundingToken?: string
    endsAt: string
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onVote: (pollId: string, optionId: string) => Promise<void> | void
  isVoting?: boolean
  isVoteConfirming?: boolean
}

export function VoteDialog({ poll, open, onOpenChange, onVote, isVoting, isVoteConfirming }: VoteDialogProps) {
  const [selectedOption, setSelectedOption] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [hasStartedVoting, setHasStartedVoting] = useState(false)

  const handleVote = async () => {
    if (!selectedOption) return

    setError(null)
    setHasStartedVoting(true)

    try {
      await onVote(poll.id, selectedOption)
      // Dialog will close after transaction is confirmed (handled by parent)
    } catch (err) {
      // Show error but keep dialog open
      setError(err instanceof Error ? err.message : "Failed to submit vote")
      setHasStartedVoting(false)
    }
  }

  // Close dialog after successful confirmation
  useEffect(() => {
    if (hasStartedVoting && !isVoting && !isVoteConfirming && !error) {
      // Transaction completed successfully, close dialog
      onOpenChange(false)
      setSelectedOption("")
      setHasStartedVoting(false)
    }
  }, [hasStartedVoting, isVoting, isVoteConfirming, error, onOpenChange])

  // Determine if we're in a voting state
  const voting = isVoting || isVoteConfirming

  const daysRemaining = Math.ceil((new Date(poll.endsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  // Prevent closing dialog while voting is in progress
  const handleOpenChange = (newOpen: boolean) => {
    if (voting && !newOpen) {
      // Don't allow closing while voting
      return
    }
    onOpenChange(newOpen)
    // Reset state when dialog is closed
    if (!newOpen) {
      setError(null)
      setSelectedOption("")
      setHasStartedVoting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => voting && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-left">{poll.title}</DialogTitle>
          <DialogDescription className="text-left">
            {poll.creator ? `Poll created by ${poll.creator}` : poll.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{poll.totalVotes}</span>
              </div>
              <p className="text-xs text-muted-foreground">Votes</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Coins className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{formatRewardDisplay(poll.totalReward, poll.fundingToken)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Reward</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{daysRemaining}d</span>
              </div>
              <p className="text-xs text-muted-foreground">Left</p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
              {error}
            </div>
          )}

          {/* Voting status message */}
          {isVoting && (
            <div className="p-3 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Please confirm the transaction in your wallet...</span>
            </div>
          )}
          {isVoteConfirming && (
            <div className="p-3 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Transaction confirming on-chain...</span>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-sm font-medium">Choose your option:</Label>
            <RadioGroup
              value={selectedOption}
              onValueChange={setSelectedOption}
              disabled={voting}
            >
              {poll.options.map((option) => (
                <div key={option.id} className={`flex items-center space-x-2 p-3 border rounded-lg ${voting ? 'opacity-50' : ''}`}>
                  <RadioGroupItem value={option.id} id={option.id} disabled={voting} />
                  <Label htmlFor={option.id} className={`flex-1 ${voting ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    <div className="flex justify-between items-center">
                      <span>{option.text}</span>
                      <span className="text-sm text-muted-foreground">{option.percentage}%</span>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={voting}>
            Cancel
          </Button>
          <Button
            onClick={handleVote}
            disabled={!selectedOption || voting}
          >
            {voting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <Vote className="h-4 w-4 mr-2" />
                Submit Vote
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
