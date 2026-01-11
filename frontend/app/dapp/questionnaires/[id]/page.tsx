"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ArrowLeft,
  Calendar,
  Clock,
  ListChecks,
  Coins,
  Users,
  Loader2,
  Edit,
} from "lucide-react"
import { useAccount, useChainId } from "wagmi"
import { format } from "date-fns"
import {
  useQuestionnaire,
  useQuestionnaireProgress,
} from "@/hooks/use-questionnaires"
import { QuestionnaireAnswerFlow } from "@/components/questionnaire/questionnaire-answer-flow"
import type { QuestionnaireWithPolls } from "@/lib/api/questionnaires-client"
import { getTokenSymbol as getTokenSymbolByAddress, TOKEN_INFO } from "@/lib/contracts/token-config"

interface PageProps {
  params: { id: string }
}

export default function QuestionnaireDetailPage({ params }: PageProps) {
  const router = useRouter()
  const { id } = params
  const { address, isConnected } = useAccount()
  const chainId = useChainId()

  // Fetch questionnaire with polls
  const {
    data: questionnaire,
    isLoading,
    error,
    refetch,
  } = useQuestionnaire(id, true) as {
    data: QuestionnaireWithPolls | undefined
    isLoading: boolean
    error: Error | null
    refetch: () => void
  }

  // Fetch user's progress
  const { data: progress, refetch: refetchProgress } = useQuestionnaireProgress(id)

  const getTokenSymbol = (tokenAddress: string) => {
    if (!tokenAddress) return "Unknown"
    // If it's already a symbol, return it
    if (TOKEN_INFO[tokenAddress]) return tokenAddress
    // Otherwise try to look up by address
    const symbol = getTokenSymbolByAddress(chainId, tokenAddress as `0x${string}`)
    return symbol || "Unknown"
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading questionnaire...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !questionnaire) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Questionnaire Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This questionnaire doesn't exist or failed to load.
          </p>
          <Button onClick={() => router.push("/dapp/questionnaires")}>
            Back to Questionnaires
          </Button>
        </div>
      </div>
    )
  }

  const isCreator =
    address?.toLowerCase() === questionnaire.creatorAddress.toLowerCase()
  const hasRewards =
    questionnaire.totalRewardAmount &&
    parseFloat(questionnaire.totalRewardAmount) > 0

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/dapp/questionnaires")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Questionnaires
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{questionnaire.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {questionnaire.creatorAddress.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>
                  {questionnaire.creatorAddress.slice(0, 8)}...
                  {questionnaire.creatorAddress.slice(-6)}
                </span>
              </div>
              <Badge
                variant={
                  questionnaire.status === "active"
                    ? "default"
                    : questionnaire.status === "draft"
                    ? "secondary"
                    : "destructive"
                }
              >
                {questionnaire.status}
              </Badge>
              {isCreator && <Badge variant="outline">Creator</Badge>}
            </div>
          </div>
          {isCreator && (
            <Button
              variant="outline"
              onClick={() => router.push(`/dapp/questionnaires/${id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Answer Flow */}
        <div className="lg:col-span-2 space-y-6">
          {questionnaire.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{questionnaire.description}</p>
              </CardContent>
            </Card>
          )}

          {questionnaire.status === "active" ? (
            <QuestionnaireAnswerFlow
              questionnaire={questionnaire}
              onComplete={() => {
                refetch()
                refetchProgress()
              }}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <ListChecks className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {questionnaire.status === "draft"
                    ? "Not Yet Active"
                    : "Questionnaire Closed"}
                </h3>
                <p className="text-muted-foreground">
                  {questionnaire.status === "draft"
                    ? "This questionnaire is still being prepared."
                    : "This questionnaire is no longer accepting responses."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ListChecks className="h-4 w-4" />
                  <span className="text-sm">Polls</span>
                </div>
                <span className="font-semibold">{questionnaire.pollCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Completions</span>
                </div>
                <span className="font-semibold">{questionnaire.completionCount}</span>
              </div>

              {questionnaire.category && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <Badge variant="outline">{questionnaire.category}</Badge>
                </div>
              )}

              {questionnaire.startTime && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Starts</span>
                  </div>
                  <span className="text-sm">
                    {format(new Date(questionnaire.startTime), "PP")}
                  </span>
                </div>
              )}

              {questionnaire.endTime && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Ends</span>
                  </div>
                  <span className="text-sm">
                    {format(new Date(questionnaire.endTime), "PP")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rewards */}
          {hasRewards && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Coins className="h-5 w-5" />
                  Rewards
                </CardTitle>
                <CardDescription>
                  Distributed to participants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Pool</span>
                  <span className="text-xl font-bold text-primary">
                    {questionnaire.totalRewardAmount}{" "}
                    {getTokenSymbol(questionnaire.fundingToken)}
                  </span>
                </div>

                {questionnaire.rewardDistribution &&
                  questionnaire.rewardDistribution.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Distribution</p>
                        {questionnaire.rewardDistribution.map((dist, index) => (
                          <div
                            key={`${dist.chainId}-${dist.pollId}`}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-muted-foreground">
                              Poll #{dist.pollId}
                            </span>
                            <span>{dist.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
              </CardContent>
            </Card>
          )}

          {/* Your Progress */}
          {isConnected && progress && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Polls Answered</span>
                  <span className="font-semibold">
                    {progress.pollsAnswered.length}/{questionnaire.pollCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={progress.isComplete ? "default" : "secondary"}
                  >
                    {progress.isComplete ? "Completed" : "In Progress"}
                  </Badge>
                </div>
                {progress.completedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="text-sm">
                      {format(new Date(progress.completedAt), "PP")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
