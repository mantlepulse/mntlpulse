"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Clock, Users, Coins, TrendingUp, Award, Sparkles, Vote } from "lucide-react"
import { usePoll, useHasUserVoted, usePollsContractAddress, useUserVotesInPoll, formatPollData } from "@/lib/contracts/polls-contract-utils"
import { VotingType } from "@/lib/contracts/polls-contract"
import { useAccount, useChainId } from "wagmi"
import { getTokenSymbol, TOKEN_INFO } from "@/lib/contracts/token-config"
import { formatRewardDisplay } from "@/lib/utils/format-reward"
import { ClaimRewardsDialog } from "@/components/sideshift/claim-rewards-dialog"
import { FundingHistory } from "@/components/poll/funding-history"
import { QuadraticVotePanel } from "@/components/poll/quadratic-vote-panel"
import { formatEther } from "viem"

interface PageProps {
  params: { id: string }
}

export default function PollDetailPage({ params }: PageProps) {
  const router = useRouter()
  const pollId = parseInt(params.id)
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [claimDialogOpen, setClaimDialogOpen] = useState(false)

  const contractAddress = usePollsContractAddress()
  const { data: pollData, isLoading, error, refetch: refetchPoll } = usePoll(pollId)
  const { data: hasVoted, refetch: refetchHasVoted } = useHasUserVoted(pollId, address)
  // Must call all hooks unconditionally before any early returns
  const { data: userVotesInPoll, refetch: refetchUserVotes } = useUserVotesInPoll(pollId, address)

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading poll...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !pollData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Poll Not Found</h2>
          <p className="text-muted-foreground mb-4">This poll doesn't exist or failed to load.</p>
          <Button onClick={() => router.push('/dapp')}>Back to Polls</Button>
        </div>
      </div>
    )
  }

  const [id, question, options, votes, endTime, isActive, creator, totalFunding, , fundingToken, , , , votingType] = pollData
  const isQuadraticVoting = votingType === VotingType.QUADRATIC

  // Get funding token symbol and decimals (PULSE is default for poll funding on Mantle)
  const fundingTokenSymbol = chainId ? getTokenSymbol(chainId, fundingToken) || 'PULSE' : 'PULSE'
  const tokenDecimals = TOKEN_INFO[fundingTokenSymbol]?.decimals || 18

  // Calculate poll stats
  const totalVotes = votes.reduce((sum: number, vote: bigint) => sum + Number(vote), 0)
  const timeRemaining = new Date(Number(endTime) * 1000).getTime() - new Date().getTime()
  const hasEnded = timeRemaining <= 0
  const daysRemaining = Math.max(0, Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)))
  const totalReward = Number(totalFunding) / Math.pow(10, tokenDecimals)

  // Calculate user's potential reward (simplified - winner takes all for now)
  const userReward = hasEnded && hasVoted && totalReward > 0 ? totalReward / totalVotes : 0

  // Format options with stats
  const formattedOptions = options.map((option: string, index: number) => {
    const voteCount = Number(votes[index])
    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
    const isWinning = voteCount === Math.max(...votes.map((v: bigint) => Number(v)))

    return {
      id: `${id}-${index}`,
      text: option,
      votes: voteCount,
      percentage,
      isWinning: voteCount > 0 && isWinning,
    }
  })

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dapp')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Polls
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{question}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">{creator.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span>{creator.slice(0, 8)}...{creator.slice(-6)}</span>
              </div>
              <Badge variant={hasEnded ? "destructive" : "default"}>
                {hasEnded ? "Ended" : "Active"}
              </Badge>
              {isQuadraticVoting && (
                <Badge variant="outline" className="border-primary text-primary">
                  <Vote className="h-3 w-3 mr-1" />
                  Quadratic
                </Badge>
              )}
              {hasVoted && <Badge variant="secondary">You Voted</Badge>}
              {isQuadraticVoting && userVotesInPoll !== undefined && Number(userVotesInPoll) > 0 && (
                <Badge variant="secondary">
                  {String(Number(userVotesInPoll))} {Number(userVotesInPoll) === 1 ? 'vote' : 'votes'} purchased
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Poll Options */}
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                {totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formattedOptions.map((option) => (
                <div key={option.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{option.text}</span>
                      {option.isWinning && totalVotes > 0 && (
                        <Award className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {option.votes} {option.votes === 1 ? 'vote' : 'votes'}
                      </span>
                      <span className="text-sm font-semibold min-w-[3rem] text-right">
                        {option.percentage}%
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={option.percentage}
                    className="h-3"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quadratic Voting Panel */}
          {isQuadraticVoting && !hasEnded && isConnected && (
            <QuadraticVotePanel
              pollId={pollId}
              options={options as string[]}
              votes={votes as bigint[]}
              onVoteSuccess={() => {
                // Refresh poll data after successful vote
                refetchPoll()
                refetchHasVoted()
                refetchUserVotes()
              }}
            />
          )}

          {/* Quadratic Voting Info for non-connected users */}
          {isQuadraticVoting && !hasEnded && !isConnected && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Vote className="h-5 w-5 text-primary" />
                  Quadratic Voting Poll
                </CardTitle>
                <CardDescription>
                  This poll uses quadratic voting. Connect your wallet to buy votes with PULSE tokens.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  In quadratic voting, the cost of each vote increases quadratically (1, 4, 9, 16...).
                  This helps balance voting power and encourages more thoughtful participation.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Reward Claim Section */}
          {hasEnded && hasVoted && totalReward > 0 && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  Claim Your Rewards
                </CardTitle>
                <CardDescription>
                  This poll has ended. You're eligible to claim rewards!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <span className="text-muted-foreground">Your Estimated Reward</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatRewardDisplay(userReward, fundingTokenSymbol)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Convert your {fundingTokenSymbol} rewards to any cryptocurrency using SideShift.ai
                  </p>
                  <Button
                    onClick={() => setClaimDialogOpen(true)}
                    className="w-full"
                    size="lg"
                    disabled={!isConnected}
                  >
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Claim Rewards
                  </Button>
                  {!isConnected && (
                    <p className="text-xs text-center text-muted-foreground">
                      Connect your wallet to claim rewards
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Funding History */}
          {chainId && (
            <FundingHistory chainId={chainId} pollId={pollId.toString()} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Poll Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Poll Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Vote className="h-4 w-4" />
                  <span className="text-sm">Voting Type</span>
                </div>
                <Badge variant={isQuadraticVoting ? "default" : "secondary"}>
                  {isQuadraticVoting ? "Quadratic" : "Linear"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Total Votes</span>
                </div>
                <span className="font-semibold">{totalVotes}</span>
              </div>
              {isQuadraticVoting && userVotesInPoll !== undefined && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm">Your Votes</span>
                  </div>
                  <span className="font-semibold">{String(Number(userVotesInPoll))}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Coins className="h-4 w-4" />
                  <span className="text-sm">Total Funding</span>
                </div>
                <span className="font-semibold">{formatRewardDisplay(totalReward, fundingTokenSymbol)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Time Remaining</span>
                </div>
                <span className="font-semibold">
                  {hasEnded ? 'Ended' : `${daysRemaining}d`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Contract Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contract Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Poll ID</p>
                <p className="text-sm font-mono">#{id.toString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Contract</p>
                <p className="text-sm font-mono break-all">{contractAddress}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">End Time</p>
                <p className="text-sm">
                  {new Date(Number(endTime) * 1000).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Claim Rewards Dialog */}
      <ClaimRewardsDialog
        pollId={pollId.toString()}
        rewardAmount={userReward.toFixed(6)}
        open={claimDialogOpen}
        onOpenChange={setClaimDialogOpen}
        onSuccess={() => {
          // Refresh poll data after claiming rewards
          refetchPoll()
          refetchHasVoted()
          refetchUserVotes()
        }}
      />
    </div>
  )
}
