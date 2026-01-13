/**
 * Poll Card Component
 * Compact card-based display for individual polls in manage view
 */

"use client"

import { useState } from "react"
import { Clock, MoreVertical, HelpCircle, Pencil } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { TOKEN_INFO } from "@/lib/contracts/token-config"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PendingDistributionBadge } from "@/components/creator/pending-distribution-badge"
import { EditPollTitleDialog } from "@/components/creator/edit-poll-title-dialog"
import { usePendingDistributions } from "@/lib/hooks/use-pending-distributions"
import { toast } from "sonner"

interface PollCardProps {
  poll: {
    id: bigint
    question: string
    isActive: boolean
    totalVotes: bigint
    totalFunding: bigint
    endTime: bigint
    distributionMode: 0 | 1 | 2
    fundingToken?: string
    fundingTokenSymbol?: string
    options: Array<{ text: string; votes: bigint }>
  }
  chainId: number
  creatorAddress: string
  displayTitle?: string | null
  onClosePoll: (pollId: bigint) => void
  onSetDistributionMode: (pollId: bigint, mode: number) => void
  onTitleUpdate?: (pollId: bigint, newTitle: string) => void
}

export function PollCard({
  poll,
  chainId,
  creatorAddress,
  displayTitle,
  onClosePoll,
  onSetDistributionMode,
  onTitleUpdate,
}: PollCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEditTitleOpen, setIsEditTitleOpen] = useState(false)
  const endDate = new Date(Number(poll.endTime) * 1000)
  const now = new Date()
  const isExpired = endDate < now
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Use displayTitle if available, otherwise use on-chain question
  const pollTitle = displayTitle || poll.question

  // Check for pending distributions
  const pendingStatus = usePendingDistributions(poll)

  // Get status
  const getStatus = () => {
    if (!poll.isActive) return "Closed"
    if (isExpired) return "Expired"
    return "Active"
  }

  // Calculate reward fund (PULSE is default for poll funding on Mantle)
  const decimals = TOKEN_INFO[poll.fundingTokenSymbol || "PULSE"]?.decimals || 18
  const fundingAmount = Number(poll.totalFunding) / Math.pow(10, decimals)

  const handleModeChange = async (newMode: string) => {
    if (newMode === poll.distributionMode.toString()) return
    setIsUpdating(true)
    try {
      await onSetDistributionMode(poll.id, parseInt(newMode))
      toast.success("Distribution mode updated")
    } catch (error) {
      toast.error("Failed to update mode")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base leading-tight">
              <Link
                href={`/dapp/poll/${poll.id}`}
                className="hover:text-primary transition-colors line-clamp-2"
              >
                {pollTitle}
              </Link>
            </CardTitle>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge
                variant={poll.isActive && !isExpired ? "default" : "secondary"}
                className="text-xs"
              >
                {getStatus()}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {fundingAmount > 0 ? "Funded" : "No Funds"}
              </Badge>
              <PendingDistributionBadge
                hasPending={pendingStatus.hasPending}
                mode={poll.distributionMode}
              />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dapp/poll/${poll.id}`}>View Details</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dapp/poll/${poll.id}`}>View Results</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsEditTitleOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Title
              </DropdownMenuItem>
              {poll.isActive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onClosePoll(poll.id)}
                    className="text-destructive"
                  >
                    Close Poll
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-2 space-y-3">
        {/* Compact Stats Row */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span>
              <span className="font-semibold">{Number(poll.totalVotes)}</span>
              <span className="text-muted-foreground ml-1">votes</span>
            </span>
            <span>
              <span className="font-semibold">{poll.options.length}</span>
              <span className="text-muted-foreground ml-1">options</span>
            </span>
          </div>
          {poll.isActive && !isExpired && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{daysLeft}d left</span>
            </div>
          )}
        </div>

        {/* Info Row */}
        <div className="flex items-center justify-between text-sm border-t pt-2">
          <div className="text-muted-foreground">
            Poll #{Number(poll.id)} · Expires {endDate.toLocaleDateString()}
          </div>
          <div className="font-medium">
            {fundingAmount.toFixed(4)} {poll.fundingTokenSymbol || "PULSE"}
          </div>
        </div>

        {/* Distribution Mode (compact) */}
        {poll.isActive && (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Distribution</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px] p-3 bg-popover text-popover-foreground border">
                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="font-semibold text-foreground">Manual Pull</p>
                        <p className="text-muted-foreground">
                          Responders claim their own rewards when ready. Best for giving users control over when they receive rewards.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Manual Push</p>
                        <p className="text-muted-foreground">
                          You manually distribute rewards to responders. Best for custom distribution logic or curated reward allocation.
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={poll.distributionMode.toString()}
              onValueChange={handleModeChange}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Manual Pull</SelectItem>
                <SelectItem value="1">Manual Push</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1 h-8" asChild>
            <Link href={`/dapp/poll/${poll.id}`}>Results</Link>
          </Button>
          {poll.isActive && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-destructive hover:text-destructive"
              onClick={() => onClosePoll(poll.id)}
            >
              Close Poll
            </Button>
          )}
        </div>
      </CardContent>

      {/* Edit Title Dialog */}
      <EditPollTitleDialog
        open={isEditTitleOpen}
        onOpenChange={setIsEditTitleOpen}
        pollId={poll.id}
        chainId={chainId}
        currentTitle={poll.question}
        displayTitle={displayTitle}
        creatorAddress={creatorAddress}
        onSuccess={(newTitle) => onTitleUpdate?.(poll.id, newTitle)}
      />
    </Card>
  )
}
