"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QuadraticVotePanel } from "./quadratic-vote-panel"
import { Coins } from "lucide-react"

interface QuadraticVoteDialogProps {
  pollId: number
  options: string[]
  votes: bigint[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function QuadraticVoteDialog({
  pollId,
  options,
  votes,
  open,
  onOpenChange,
  onSuccess
}: QuadraticVoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Buy Votes
          </DialogTitle>
          <DialogDescription>
            Purchase multiple votes using PULSE tokens. Cost increases quadratically.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <QuadraticVotePanel
            pollId={pollId}
            options={options}
            votes={votes}
            onVoteSuccess={() => {
              onSuccess?.()
              onOpenChange(false)
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
