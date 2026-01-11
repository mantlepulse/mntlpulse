"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Vote,
  Trophy,
  PartyPopper,
} from "lucide-react"
import { useAccount, useChainId } from "wagmi"
import { toast } from "sonner"
import {
  usePoll,
  useHasUserVoted,
  useVote,
  formatPollData,
} from "@/lib/contracts/polls-contract-utils"
import { VotingType } from "@/lib/contracts/polls-contract"
import {
  useQuestionnaireProgress,
  useStartQuestionnaireResponse,
  useUpdateQuestionnaireProgress,
} from "@/hooks/use-questionnaires"
import { QuestionnaireProgressBar } from "./questionnaire-progress-bar"
import { QuestionnairePollStepper } from "./questionnaire-poll-stepper"
import type { QuestionnaireWithPolls, QuestionnairePoll } from "@/lib/api/questionnaires-client"

interface QuestionnaireAnswerFlowProps {
  questionnaire: QuestionnaireWithPolls
  onComplete?: () => void
}

export function QuestionnaireAnswerFlow({
  questionnaire,
  onComplete,
}: QuestionnaireAnswerFlowProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()

  // Sort polls by sortOrder
  const sortedPolls = useMemo(
    () => [...questionnaire.polls].sort((a, b) => a.sortOrder - b.sortOrder),
    [questionnaire.polls]
  )

  // Track current poll index
  const [currentPollIndex, setCurrentPollIndex] = useState(0)
  const currentPoll = sortedPolls[currentPollIndex]

  // Progress tracking
  const { data: progress, refetch: refetchProgress } = useQuestionnaireProgress(
    questionnaire.id
  )
  const startResponseMutation = useStartQuestionnaireResponse()
  const updateProgressMutation = useUpdateQuestionnaireProgress()

  // Get answered poll IDs from progress
  const answeredPollIds = useMemo(
    () => progress?.pollsAnswered || [],
    [progress]
  )

  // Start response on mount if not already started
  useEffect(() => {
    if (isConnected && address && !progress?.started && !startResponseMutation.isPending) {
      startResponseMutation.mutate(questionnaire.id, {
        onSuccess: () => refetchProgress(),
      })
    }
  }, [isConnected, address, questionnaire.id, progress?.started, startResponseMutation, refetchProgress])

  // Find first unanswered poll on load
  useEffect(() => {
    if (answeredPollIds.length > 0 && sortedPolls.length > 0) {
      const firstUnansweredIndex = sortedPolls.findIndex(
        (poll) => !answeredPollIds.includes(`${poll.chainId}-${poll.pollId}`)
      )
      if (firstUnansweredIndex !== -1) {
        setCurrentPollIndex(firstUnansweredIndex)
      }
    }
  }, [answeredPollIds, sortedPolls])

  const handlePollAnswered = (pollId: number) => {
    // Update progress in the API
    updateProgressMutation.mutate(
      {
        questionnaireId: questionnaire.id,
        pollId: pollId.toString(),
      },
      {
        onSuccess: (newProgress) => {
          refetchProgress()
          if (newProgress.isComplete) {
            toast.success("Congratulations! You've completed the questionnaire!")
            onComplete?.()
          } else {
            // Move to next poll
            if (currentPollIndex < sortedPolls.length - 1) {
              setCurrentPollIndex((prev) => prev + 1)
            }
          }
        },
      }
    )
  }

  const handleNavigate = (index: number) => {
    if (index >= 0 && index < sortedPolls.length) {
      setCurrentPollIndex(index)
    }
  }

  // Completion screen
  if (progress?.isComplete) {
    return (
      <Card className="text-center">
        <CardContent className="py-12 space-y-4">
          <PartyPopper className="h-16 w-16 mx-auto text-primary" />
          <h2 className="text-2xl font-bold">Questionnaire Complete!</h2>
          <p className="text-muted-foreground">
            You've answered all {sortedPolls.length} polls in this questionnaire.
          </p>
          <Badge variant="default" className="text-lg px-4 py-1">
            <Trophy className="h-4 w-4 mr-2" />
            100% Complete
          </Badge>
        </CardContent>
      </Card>
    )
  }

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground">
            Please connect your wallet to participate in this questionnaire.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <QuestionnaireProgressBar
        totalPolls={sortedPolls.length}
        answeredPolls={answeredPollIds.length}
        isComplete={progress?.isComplete || false}
      />

      {/* Poll Stepper */}
      <QuestionnairePollStepper
        polls={sortedPolls}
        currentIndex={currentPollIndex}
        answeredPollIds={answeredPollIds}
        onNavigate={handleNavigate}
      />

      {/* Current Poll */}
      {currentPoll && (
        <InlinePollVoting
          chainId={currentPoll.chainId}
          pollId={currentPoll.pollId}
          onVoteSuccess={() => handlePollAnswered(currentPoll.pollId)}
          isAlreadyAnswered={answeredPollIds.includes(
            `${currentPoll.chainId}-${currentPoll.pollId}`
          )}
        />
      )}
    </div>
  )
}

// Inline poll voting component
interface InlinePollVotingProps {
  chainId: number
  pollId: number
  onVoteSuccess: () => void
  isAlreadyAnswered: boolean
}

function InlinePollVoting({
  chainId,
  pollId,
  onVoteSuccess,
  isAlreadyAnswered,
}: InlinePollVotingProps) {
  const { address } = useAccount()
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [hasVotedLocally, setHasVotedLocally] = useState(false)

  // Reset local state when poll changes
  useEffect(() => {
    setSelectedOption(null)
    setHasVotedLocally(false)
  }, [pollId])

  // Fetch poll data from contract
  const { data: pollData, isLoading: isPollLoading, refetch: refetchPoll } = usePoll(pollId)
  const { data: hasVotedOnChain, refetch: refetchHasVoted } = useHasUserVoted(pollId, address)

  // Voting hook
  const { vote, isPending: isVoting, isConfirming, isSuccess, error } = useVote()

  // Parse poll data
  const poll = useMemo(() => {
    if (!pollData) return null
    return formatPollData(pollData)
  }, [pollData])

  // Handle vote success
  useEffect(() => {
    if (isSuccess && !hasVotedLocally) {
      setHasVotedLocally(true)
      toast.success("Vote submitted successfully!")
      refetchPoll()
      refetchHasVoted()
      onVoteSuccess()
    }
  }, [isSuccess, hasVotedLocally, refetchPoll, refetchHasVoted, onVoteSuccess])

  // Handle error
  useEffect(() => {
    if (error) {
      toast.error(`Failed to vote: ${error.message}`)
    }
  }, [error])

  const handleVote = async () => {
    if (selectedOption === null) {
      toast.error("Please select an option")
      return
    }
    await vote(pollId, selectedOption)
  }

  const isProcessing = isVoting || isConfirming
  const hasVoted = hasVotedOnChain || isAlreadyAnswered || hasVotedLocally

  if (isPollLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!poll) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Failed to load poll data</p>
        </CardContent>
      </Card>
    )
  }

  const isQuadraticVoting = poll.votingType === VotingType.QUADRATIC
  const totalVotes = poll.votes.reduce(
    (sum: number, v: bigint) => sum + Number(v),
    0
  )

  // Format options with vote counts
  const options = poll.options.map((option: string, index: number) => ({
    id: `${pollId}-${index}`,
    text: option,
    votes: Number(poll.votes[index]),
    percentage: totalVotes > 0 ? Math.round((Number(poll.votes[index]) / totalVotes) * 100) : 0,
  }))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{poll.question}</CardTitle>
            <CardDescription>
              {totalVotes} {totalVotes === 1 ? "vote" : "votes"} cast
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isQuadraticVoting && (
              <Badge variant="outline" className="border-primary text-primary">
                <Vote className="h-3 w-3 mr-1" />
                Quadratic
              </Badge>
            )}
            {hasVoted && (
              <Badge variant="secondary">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Voted
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasVoted ? (
          // Show results after voting
          <div className="space-y-3">
            {options.map((option) => (
              <div key={option.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{option.text}</span>
                  <span className="text-muted-foreground">
                    {option.votes} ({option.percentage}%)
                  </span>
                </div>
                <Progress value={option.percentage} className="h-2" />
              </div>
            ))}
            <p className="text-sm text-muted-foreground text-center pt-2">
              You have already voted on this poll
            </p>
          </div>
        ) : isQuadraticVoting ? (
          // Quadratic voting requires PULSE tokens - show info
          <div className="text-center py-4">
            <Vote className="h-10 w-10 mx-auto text-primary mb-3" />
            <p className="text-muted-foreground mb-4">
              This poll uses quadratic voting. Visit the poll page to purchase votes with PULSE
              tokens.
            </p>
            <Button variant="outline" asChild>
              <a href={`/dapp/poll/${pollId}`} target="_blank" rel="noopener noreferrer">
                Open Poll Page
              </a>
            </Button>
          </div>
        ) : (
          // Linear voting - show options
          <>
            <RadioGroup
              value={selectedOption?.toString()}
              onValueChange={(value) => setSelectedOption(parseInt(value))}
              disabled={isProcessing}
            >
              {options.map((option, index) => (
                <div
                  key={option.id}
                  className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors ${
                    selectedOption === index ? "border-primary bg-primary/5" : ""
                  } ${isProcessing ? "opacity-50" : "hover:bg-muted/50"}`}
                >
                  <RadioGroupItem
                    value={index.toString()}
                    id={option.id}
                    disabled={isProcessing}
                  />
                  <Label
                    htmlFor={option.id}
                    className={`flex-1 ${isProcessing ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <Button
              onClick={handleVote}
              disabled={selectedOption === null || isProcessing}
              className="w-full"
            >
              {isVoting && (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting vote...
                </>
              )}
              {isConfirming && (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming on-chain...
                </>
              )}
              {!isProcessing && (
                <>
                  <Vote className="h-4 w-4 mr-2" />
                  Submit Vote
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
