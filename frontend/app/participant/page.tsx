/**
 * Participant Dashboard Page
 * Main page for viewing polls, quests, and claiming rewards
 */

"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import { useRouter } from "next/navigation"
import { AlertCircle, Vote, Sparkles, ChevronRight, Clock, Users, Coins, Target, Trophy, ArrowRight, ListChecks } from "lucide-react"
import { ParticipantBreadcrumb } from "@/components/participant/participant-breadcrumb"
import { CreatorHeaderBanner } from "@/components/creator/creator-header-banner"
import { ParticipantStats } from "@/components/participant/participant-stats"
import { ClaimableRewardsList } from "@/components/participant/claimable-rewards-list"
import { ClaimHistory } from "@/components/participant/claim-history"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { usePollsData } from "@/hooks/use-polls-data"
import { useAvailableQuests } from "@/hooks/use-creator-quests"
import { formatRewardDisplay } from "@/lib/utils/format-reward"
import { QuestActionDialog } from "@/components/participant/quests/quest-action-dialog"
import type { CreatorQuestWithParticipation } from "@/lib/api/creator-quests-client"
import { useParticipantRewards } from "@/hooks/use-participant-rewards"
import { useActiveQuestionnaires, useQuestionnaireProgress, type Questionnaire } from "@/hooks/use-questionnaires"

export default function ParticipantPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()

  // Use the participant rewards hook to fetch data from subgraph and contract
  const {
    rewards,
    claimHistory,
    stats,
    isLoading: rewardsLoading,
    refetch: refetchRewards,
  } = useParticipantRewards()

  // Fetch active polls (limit to 3 for dashboard preview)
  const { polls: activePolls, loading: pollsLoading } = usePollsData({ pageSize: 3 })

  // Fetch available quests
  const { data: quests, isLoading: questsLoading, refetch: refetchQuests } = useAvailableQuests(true)
  const availableQuests = quests?.filter(q => !q.participation?.isCompleted).slice(0, 3) || []

  // Fetch active questionnaires
  const { data: questionnaires, isLoading: questionnairesLoading } = useActiveQuestionnaires(3, 0)
  const activeQuestionnaires = questionnaires || []

  // Quest dialog state
  const [selectedQuest, setSelectedQuest] = useState<CreatorQuestWithParticipation | null>(null)
  const [questDialogOpen, setQuestDialogOpen] = useState(false)

  const handleQuestClick = (quest: CreatorQuestWithParticipation) => {
    setSelectedQuest(quest)
    setQuestDialogOpen(true)
  }

  const handleQuestDialogClose = (open: boolean) => {
    setQuestDialogOpen(open)
    if (!open) {
      setSelectedQuest(null)
    }
  }

  const handleQuestProgressUpdate = () => {
    refetchQuests()
    setQuestDialogOpen(false)
  }

  // Combined loading state
  const isLoading = rewardsLoading

  // Show wallet connection warning if not connected
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <ParticipantBreadcrumb />

          <div className="flex items-center gap-2 rounded-lg border border-warning bg-warning/10 p-4">
            <AlertCircle className="h-5 w-5 text-warning" />
            <p className="text-sm">
              Please connect your wallet to view your rewards
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Filter active polls (not ended)
  const activePollsToShow = activePolls.filter(poll => poll.status === 'active').slice(0, 3)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <ParticipantBreadcrumb />

        {/* Header Banner */}
        <CreatorHeaderBanner
          title="Participant Dashboard"
          description="Vote on polls, complete quests, and claim your rewards"
        />

        {/* Stats */}
        <ParticipantStats
          totalClaimable={stats.totalClaimable}
          pollsParticipated={stats.pollsParticipated}
          totalClaimed={stats.totalClaimed}
          pendingClaims={stats.pendingClaims}
          isLoading={isLoading}
        />

        {/* Claimable Rewards Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Coins className="h-6 w-6 text-primary" />
              Claimable Rewards
            </h2>
            <p className="text-sm text-muted-foreground">
              Rewards available to claim from polls you participated in
            </p>
          </div>

          <ClaimableRewardsList rewards={rewards} isLoading={isLoading} onClaimSuccess={refetchRewards} />
        </div>

        {/* Active Polls Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Vote className="h-6 w-6 text-primary" />
                Active Polls
              </h2>
              <p className="text-sm text-muted-foreground">
                Vote on polls to participate and earn rewards
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push('/dapp')}>
              View All Polls
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {pollsLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-lg" />
              ))}
            </div>
          ) : activePollsToShow.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Vote className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No active polls at the moment</p>
                <Button variant="link" onClick={() => router.push('/dapp')}>
                  Browse all polls
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {activePollsToShow.map((poll) => (
                <Card
                  key={poll.id}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                  onClick={() => router.push(`/dapp/poll/${poll.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="default" className="text-xs">Active</Badge>
                      {poll.totalReward > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Coins className="w-3 h-3 mr-1" />
                          {formatRewardDisplay(poll.totalReward, poll.fundingToken)}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg line-clamp-2 mt-2">{poll.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{poll.totalVotes} votes</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(poll.endsAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Click to vote</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Available Quests Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Available Quests
              </h2>
              <p className="text-sm text-muted-foreground">
                Complete quests to earn points and rewards
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push('/participant/quests')}>
              View All Quests
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {questsLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-lg" />
              ))}
            </div>
          ) : availableQuests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No quests available at the moment</p>
                <Button variant="link" onClick={() => router.push('/participant/quests')}>
                  Browse all quests
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {availableQuests.map((quest) => {
                const progress = quest.participation?.progress || 0
                const target = quest.requirements.target
                const progressPercentage = Math.min(Math.round((progress / target) * 100), 100)

                return (
                  <Card
                    key={quest.id}
                    className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                    onClick={() => handleQuestClick(quest)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {quest.questType === 'participation' ? 'Participation' : 'Engagement'}
                        </Badge>
                        <div className="flex items-center gap-1 text-amber-500">
                          <Trophy className="w-4 h-4" />
                          <span className="font-bold text-sm">{quest.pointsReward} pts</span>
                        </div>
                      </div>
                      <CardTitle className="text-lg line-clamp-2 mt-2">{quest.name}</CardTitle>
                      <CardDescription className="line-clamp-2">{quest.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{progress} / {target}</span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs text-muted-foreground">Click to start quest</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Quest Action Dialog */}
        <QuestActionDialog
          quest={selectedQuest}
          open={questDialogOpen}
          onOpenChange={handleQuestDialogClose}
          onProgressUpdate={handleQuestProgressUpdate}
        />

        {/* Available Questionnaires Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ListChecks className="h-6 w-6 text-primary" />
                Available Questionnaires
              </h2>
              <p className="text-sm text-muted-foreground">
                Answer grouped polls together and earn rewards
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push('/dapp/questionnaires')}>
              View All Questionnaires
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {questionnairesLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-lg" />
              ))}
            </div>
          ) : activeQuestionnaires.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <ListChecks className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No questionnaires available at the moment</p>
                <Button variant="link" onClick={() => router.push('/dapp/questionnaires')}>
                  Browse all questionnaires
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {activeQuestionnaires.map((questionnaire) => (
                <QuestionnairePreviewCard
                  key={questionnaire.id}
                  questionnaire={questionnaire}
                  onClick={() => router.push(`/dapp/questionnaires/${questionnaire.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Claim History Section */}
        <ClaimHistory claims={claimHistory} isLoading={isLoading} />
      </div>
    </div>
  )
}

// Simple preview card for questionnaires on participant dashboard
function QuestionnairePreviewCard({
  questionnaire,
  onClick,
}: {
  questionnaire: Questionnaire
  onClick: () => void
}) {
  const pollCount = questionnaire.pollCount || 0

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="default" className="text-xs">Active</Badge>
          {questionnaire.totalRewardAmount && parseFloat(questionnaire.totalRewardAmount) > 0 && (
            <Badge variant="secondary" className="text-xs">
              <Coins className="w-3 h-3 mr-1" />
              {questionnaire.totalRewardAmount} {questionnaire.fundingToken || 'PULSE'}
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg line-clamp-2 mt-2">{questionnaire.title}</CardTitle>
        {questionnaire.description && (
          <CardDescription className="line-clamp-2">{questionnaire.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <ListChecks className="w-4 h-4" />
              <span>{pollCount} poll{pollCount !== 1 ? 's' : ''}</span>
            </div>
            {questionnaire.endTime && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{new Date(questionnaire.endTime).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">Click to start</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
