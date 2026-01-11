"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Clock, Users, Coins, Vote, ChevronDown, Wallet, RefreshCw, Zap, TrendingUp, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { getNetworkName, getNetworkColor } from "@/lib/utils/network"
import { formatRewardDisplay } from "@/lib/utils/format-reward"
import { VoteDialog } from "./vote-dialog"
import { FundWithTokenDialog } from "./fund-with-token-dialog"
import { FundPollDialog } from "./sideshift/fund-poll-dialog"
import { QuickVoteDialog } from "./poll/quick-vote-dialog"
import { QuadraticVoteDialog } from "./poll/quadratic-vote-dialog"
import { useHasVotedOnPoll } from "@/hooks/use-has-voted-on-poll"
import { useVotedPollsCache } from "@/contexts/voted-polls-cache-context"

// Feature flag: Set to false to revert to old two-button layout
const USE_COMBINED_FUND_BUTTON = true;

interface PollOption {
  id: string
  text: string
  votes: number
  percentage: number
}

interface Poll {
  id: string
  title: string
  description: string
  creator: string
  createdAt: string
  endsAt: string
  totalVotes: number
  totalReward: number
  status: "active" | "ended" | "upcoming"
  category: string
  options: PollOption[]
  fundingType: "self" | "community" | "none"
  fundingToken?: string // Token symbol (ETH, USDC, PULSE)
  chainId?: number // Network where poll was created
  hasVoted?: boolean
  votingType?: "standard" | "quadratic" // Type of voting mechanism
}

interface PollCardProps {
  poll: Poll
  onVote?: (pollId: string, optionId: string) => Promise<void> | void
  onViewDetails?: (pollId: string) => void
  onFundSuccess?: (pollId: number) => void
  onVoteSuccess?: (pollId: number) => void
  isVoting?: boolean
  isVoteConfirming?: boolean
  isVoteSuccess?: boolean
  votingPollId?: string | null
}

export function PollCard({
  poll,
  onVote,
  onViewDetails,
  onFundSuccess,
  onVoteSuccess,
  isVoting,
  isVoteConfirming,
  isVoteSuccess,
  votingPollId
}: PollCardProps) {
  const [isVoteDialogOpen, setIsVoteDialogOpen] = useState(false)
  const [isFundDialogOpen, setIsFundDialogOpen] = useState(false)
  const [isCryptoFundDialogOpen, setIsCryptoFundDialogOpen] = useState(false)
  const [isQuickVoteDialogOpen, setIsQuickVoteDialogOpen] = useState(false)
  const [isQuadraticVoteDialogOpen, setIsQuadraticVoteDialogOpen] = useState(false)

  // Check if current user has voted on this poll (from cache + contract fallback)
  const { hasVoted, refetch: refetchHasVoted } = useHasVotedOnPoll(poll.id)
  const { addVotedPoll } = useVotedPollsCache()

  // Add to local storage only after successful vote confirmation
  useEffect(() => {
    if (isVoteSuccess && votingPollId === poll.id) {
      // Add to voted polls cache after successful confirmation
      addVotedPoll(poll.id)
      // Refetch hasVoted status from contract for confirmation
      refetchHasVoted()
      // Notify parent to refetch poll data (for vote counts)
      onVoteSuccess?.(parseInt(poll.id))
    }
  }, [isVoteSuccess, votingPollId, poll.id, addVotedPoll, refetchHasVoted, onVoteSuccess])

  const timeRemaining = new Date(poll.endsAt).getTime() - new Date().getTime()
  const daysRemaining = Math.max(0, Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)))

  const statusColors = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    ended: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  }

  const fundingColors = {
    self: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    community: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    none: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  }

  return (
    <Card className="h-full hover:shadow-lg transition-all duration-200 gradient-card border-border/50">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg leading-tight line-clamp-2">{poll.title}</h3>
              {poll.chainId && (
                <Badge
                  variant="outline"
                  className="text-xs font-normal shrink-0"
                  style={{ borderColor: getNetworkColor(poll.chainId), color: getNetworkColor(poll.chainId) }}
                >
                  {getNetworkName(poll.chainId)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{poll.description}</p>
          </div>
          <Badge className={cn("ml-2 shrink-0", statusColors[poll.status])}>{poll.status}</Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">{poll.creator.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground">
              {poll.creator.slice(0, 6)}...{poll.creator.slice(-4)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={fundingColors[poll.fundingType]}>
              {poll.fundingType === "self" && "Self-funded"}
              {poll.fundingType === "community" && "Community"}
              {poll.fundingType === "none" && "No rewards"}
            </Badge>
            {poll.fundingToken && poll.fundingType !== "none" && (
              <Badge variant="secondary" className="font-mono text-xs">
                {poll.fundingToken}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          {poll.options.map((option) => (
            <div key={option.id} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="line-clamp-1">{option.text}</span>
                <span className="text-muted-foreground">{option.percentage}%</span>
              </div>
              <Progress value={option.percentage} className="h-2" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm font-medium">{poll.totalVotes}</span>
            </div>
            <p className="text-xs text-muted-foreground">Votes</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Coins className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm font-medium">{formatRewardDisplay(poll.totalReward, poll.fundingToken)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Reward</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm font-medium">{daysRemaining}d</span>
            </div>
            <p className="text-xs text-muted-foreground">Left</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 bg-transparent hover:bg-accent/50 hover:text-foreground" onClick={() => onViewDetails?.(poll.id)}>
          View Details
        </Button>
        {poll.status === "active" && (
          <>
            {hasVoted ? (
              <Button variant="outline" size="sm" className="flex-1 hover:bg-accent/50 hover:text-foreground" onClick={() => onViewDetails?.(poll.id)}>
                View Results
              </Button>
            ) : poll.votingType === "quadratic" ? (
              // Quadratic voting - show dropdown menu with options
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="flex-1 hover:opacity-90">
                    <Vote className="h-4 w-4 mr-2" />
                    Vote
                    <ChevronDown className="h-3 w-3 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => setIsQuickVoteDialogOpen(true)}
                    className="cursor-pointer focus:bg-accent"
                  >
                    <div className="flex items-start gap-3 py-1">
                      <Zap className="h-4 w-4 mt-0.5" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm">Quick Vote (1 vote)</span>
                        <span className="text-xs opacity-70">Fastest way to vote</span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsQuadraticVoteDialogOpen(true)}
                    className="cursor-pointer focus:bg-accent"
                  >
                    <div className="flex items-start gap-3 py-1">
                      <TrendingUp className="h-4 w-4 mt-0.5" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm">Buy Multiple Votes</span>
                        <span className="text-xs opacity-70">See cost breakdown & buy more</span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onViewDetails?.(poll.id)}
                    className="cursor-pointer focus:bg-accent"
                  >
                    <div className="flex items-start gap-3 py-1">
                      <Eye className="h-4 w-4 mt-0.5" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm">View Full Details</span>
                        <span className="text-xs opacity-70">Complete poll information</span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Standard voting - simple Vote button
              <Button size="sm" className="flex-1 hover:opacity-90" onClick={() => setIsVoteDialogOpen(true)}>
                <Vote className="h-4 w-4 mr-2" />
                Vote
              </Button>
            )}

            {poll.fundingType !== "none" && (
              USE_COMBINED_FUND_BUTTON ? (
                // New combined dropdown button
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent hover:bg-accent/50 hover:text-foreground"
                    >
                      <Coins className="h-4 w-4 mr-2" />
                      Fund Poll
                      <ChevronDown className="h-3 w-3 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={() => setIsFundDialogOpen(true)}
                      className="cursor-pointer focus:bg-accent"
                    >
                      <div className="flex items-start gap-3 py-1">
                        <Wallet className="h-4 w-4 mt-0.5" />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-sm">Fund with Mantle Tokens</span>
                          <span className="text-xs opacity-70">Use PULSE/USDC on Mantle network</span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsCryptoFundDialogOpen(true)}
                      className="cursor-pointer focus:bg-accent"
                    >
                      <div className="flex items-start gap-3 py-1">
                        <RefreshCw className="h-4 w-4 mt-0.5" />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-sm">Convert & Fund</span>
                          <span className="text-xs opacity-70">From any crypto/network via SideShift</span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // Old two-button layout (for easy revert)
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-[0.7] bg-transparent hover:bg-accent/50 hover:text-foreground"
                    onClick={() => setIsFundDialogOpen(true)}
                  >
                    <Coins className="h-4 w-4 mr-1" />
                    Fund
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-[0.3] bg-transparent hover:bg-accent/50 hover:text-foreground"
                    onClick={() => setIsCryptoFundDialogOpen(true)}
                    title="Fund with any cryptocurrency via SideShift.ai"
                  >
                    💱
                  </Button>
                </>
              )
            )}
          </>
        )}
      </CardFooter>

      <VoteDialog
        poll={poll}
        open={isVoteDialogOpen}
        onOpenChange={setIsVoteDialogOpen}
        onVote={onVote || (async () => {})}
        isVoting={isVoting && votingPollId === poll.id}
        isVoteConfirming={isVoteConfirming && votingPollId === poll.id}
      />

      <FundWithTokenDialog
        open={isFundDialogOpen}
        onOpenChange={setIsFundDialogOpen}
        pollId={parseInt(poll.id)}
        pollTitle={poll.title}
        pollFundingToken={poll.fundingToken}
        onSuccess={onFundSuccess}
      />

      <FundPollDialog
        open={isCryptoFundDialogOpen}
        onOpenChange={setIsCryptoFundDialogOpen}
        pollId={poll.id}
        pollFundingToken={poll.fundingToken}
      />

      {/* Quadratic Voting Dialogs */}
      {poll.votingType === "quadratic" && (
        <>
          <QuickVoteDialog
            pollId={parseInt(poll.id)}
            options={poll.options.map(opt => ({
              id: opt.id,
              text: opt.text,
              votes: opt.votes
            }))}
            open={isQuickVoteDialogOpen}
            onOpenChange={setIsQuickVoteDialogOpen}
            onSuccess={() => {
              onVoteSuccess?.(parseInt(poll.id))
            }}
          />

          <QuadraticVoteDialog
            pollId={parseInt(poll.id)}
            options={poll.options.map(opt => opt.text)}
            votes={poll.options.map(opt => BigInt(opt.votes))}
            open={isQuadraticVoteDialogOpen}
            onOpenChange={setIsQuadraticVoteDialogOpen}
            onSuccess={() => {
              onVoteSuccess?.(parseInt(poll.id))
            }}
          />
        </>
      )}
    </Card>
  )
}
