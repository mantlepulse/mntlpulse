'use client'

/**
 * Inline Voting Card Component
 * Displays a poll with voting options inline for quick voting within dialogs
 */

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useVote, useHasUserVoted } from '@/lib/contracts/polls-contract-utils'
import { useAccount } from 'wagmi'
import { Clock, Users, CheckCircle2, Loader2, Vote, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import type { FormattedPoll } from '@/hooks/use-polls'
import { updateQuestProgress } from '@/lib/api/creator-quests-client'

interface InlineVotingCardProps {
  poll: FormattedPoll
  questId?: string
  onVoteSuccess?: () => void
  showResults?: boolean
}

export function InlineVotingCard({ poll, questId, onVoteSuccess, showResults = true }: InlineVotingCardProps) {
  const { address, isConnected } = useAccount()
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [hasVotedLocally, setHasVotedLocally] = useState(false)
  const [questProgressUpdated, setQuestProgressUpdated] = useState(false)

  const { vote, isPending, isConfirming, isSuccess, error } = useVote()
  const { data: hasVoted, isLoading: checkingVote } = useHasUserVoted(
    parseInt(poll.id),
    address
  )

  // Track if we've processed the success callback to avoid duplicate calls
  const successHandledRef = useRef(false)

  const isActive = poll.status === 'active'
  const userHasVoted = hasVoted || hasVotedLocally
  const isVoting = isPending || isConfirming

  // Handle successful vote confirmation - only after transaction is confirmed on-chain
  useEffect(() => {
    const handleVoteConfirmed = async () => {
      if (isSuccess && !successHandledRef.current && address) {
        successHandledRef.current = true
        setHasVotedLocally(true)

        // Update quest progress if this is part of a quest
        if (questId && !questProgressUpdated) {
          try {
            await updateQuestProgress(questId, address, { increment: true })
            setQuestProgressUpdated(true)
          } catch (err) {
            console.error('Failed to update quest progress:', err)
            // Don't block the vote success - quest progress can be retried
          }
        }

        // Only call onVoteSuccess after transaction is confirmed
        onVoteSuccess?.()
      }
    }

    handleVoteConfirmed()
  }, [isSuccess, questId, address, questProgressUpdated, onVoteSuccess])

  const handleVote = async () => {
    if (!selectedOption || !isConnected || !address) return

    const optionIndex = poll.options.findIndex(opt => opt.id === selectedOption)
    if (optionIndex === -1) return

    // Reset the success handler for new vote attempt
    successHandledRef.current = false

    try {
      // This initiates the transaction - the useEffect above will handle the success
      await vote(parseInt(poll.id), optionIndex)
    } catch (err) {
      console.error('Vote failed:', err)
    }
  }

  const getTimeRemaining = () => {
    const end = new Date(poll.endsAt)
    if (end < new Date()) return 'Ended'
    return formatDistanceToNow(end, { addSuffix: true })
  }

  if (checkingVote) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={userHasVoted ? 'border-green-500/30 bg-green-500/5' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-2">{poll.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{poll.totalVotes} votes</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{getTimeRemaining()}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Active' : 'Ended'}
            </Badge>
            {userHasVoted && (
              <Badge variant="outline" className="text-green-500 border-green-500/50">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Voted
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Voting Options or Results */}
        {userHasVoted || !isActive ? (
          // Show results
          <div className="space-y-2">
            {poll.options.map((option) => (
              <div key={option.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2">{option.text}</span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {option.votes} ({option.percentage}%)
                  </span>
                </div>
                <Progress value={option.percentage} className="h-2" />
              </div>
            ))}
          </div>
        ) : (
          // Show voting options
          <div className="space-y-3">
            <RadioGroup value={selectedOption || ''} onValueChange={setSelectedOption}>
              {poll.options.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center space-x-2 p-2 rounded-lg border transition-colors ${
                    selectedOption === option.id
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="flex-1 cursor-pointer text-sm">
                    {option.text}
                  </Label>
                  {showResults && (
                    <span className="text-xs text-muted-foreground">
                      {option.percentage}%
                    </span>
                  )}
                </div>
              ))}
            </RadioGroup>

            {/* Vote Button */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleVote}
                disabled={!selectedOption || isVoting || !isConnected}
                className="flex-1"
                size="sm"
              >
                {isVoting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isPending ? 'Confirm in wallet...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Vote className="w-4 h-4 mr-2" />
                    Vote
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dapp/poll/${poll.id}`} target="_blank">
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </Button>
            </div>

            {!isConnected && (
              <p className="text-xs text-muted-foreground text-center">
                Connect your wallet to vote
              </p>
            )}

            {error && (
              <p className="text-xs text-red-500 text-center">
                Vote failed. Please try again.
              </p>
            )}
          </div>
        )}

        {/* Success Message */}
        {isSuccess && hasVotedLocally && (
          <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400">
              Vote submitted successfully!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function InlineVotingCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}
