'use client'

/**
 * Quest Action Dialog Component
 * Main dialog that opens when clicking on a quest card
 * Renders different content based on quest requirement type
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Trophy, Target, Clock, Users, CheckCircle2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type {
  CreatorQuestWithParticipation,
  CreatorQuestRequirementType,
} from '@/lib/api/creator-quests-client'

// Content components for different quest types
import { VoteOnPollsContent } from './dialog-content/vote-on-polls-content'
import { VoteOnSpecificPollContent } from './dialog-content/vote-on-specific-poll-content'
import { SharePollContent } from './dialog-content/share-poll-content'
import { FirstNVotersContent } from './dialog-content/first-n-voters-content'
import { ParticipateInPollsContent } from './dialog-content/participate-in-polls-content'

const requirementTypeLabels: Record<CreatorQuestRequirementType, string> = {
  vote_on_polls: 'Vote on Polls',
  vote_on_specific_poll: 'Vote on Specific Poll',
  share_poll: 'Share Poll',
  first_n_voters: 'First N Voters',
  participate_n_polls: 'Participate in Polls',
}

interface QuestActionDialogProps {
  quest: CreatorQuestWithParticipation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onProgressUpdate?: () => void
}

export function QuestActionDialog({
  quest,
  open,
  onOpenChange,
  onProgressUpdate,
}: QuestActionDialogProps) {
  if (!quest) return null

  const participation = quest.participation
  const isCompleted = participation?.isCompleted
  const progress = participation?.progress || 0
  const target = quest.requirements.target
  const progressPercentage = Math.min(Math.round((progress / target) * 100), 100)

  const getTimeRemaining = () => {
    if (!quest.endTime) return null
    const end = new Date(quest.endTime)
    if (end < new Date()) return 'Ended'
    return `Ends ${formatDistanceToNow(end, { addSuffix: true })}`
  }

  const timeRemaining = getTimeRemaining()

  // Render content based on quest requirement type
  const renderContent = () => {
    const requirementType = quest.requirements.type

    switch (requirementType) {
      case 'vote_on_polls':
        return (
          <VoteOnPollsContent
            quest={quest}
            onProgressUpdate={onProgressUpdate}
          />
        )
      case 'vote_on_specific_poll':
        return (
          <VoteOnSpecificPollContent
            quest={quest}
            onProgressUpdate={onProgressUpdate}
          />
        )
      case 'share_poll':
        return (
          <SharePollContent
            quest={quest}
            onProgressUpdate={onProgressUpdate}
          />
        )
      case 'first_n_voters':
        return (
          <FirstNVotersContent
            quest={quest}
            onProgressUpdate={onProgressUpdate}
          />
        )
      case 'participate_n_polls':
        return (
          <ParticipateInPollsContent
            quest={quest}
            onProgressUpdate={onProgressUpdate}
          />
        )
      default:
        return (
          <div className="py-8 text-center text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Quest type not supported yet</p>
          </div>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {requirementTypeLabels[quest.requirements.type]}
                </Badge>
                {isCompleted && (
                  <Badge variant="default" className="bg-green-500 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl">{quest.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {quest.description}
              </DialogDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-amber-500">
                <Trophy className="w-5 h-5" />
                <span className="font-bold text-lg">{quest.pointsReward}</span>
                <span className="text-xs text-muted-foreground">pts</span>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {progress} / {target}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />

            {/* Metadata */}
            <div className="flex flex-wrap gap-3 pt-1">
              {timeRemaining && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {timeRemaining}
                </div>
              )}
              {quest.maxCompletions && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  {quest.maxCompletions - quest.currentCompletions} slots left
                </div>
              )}
              {quest.currentCompletions > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3" />
                  {quest.currentCompletions} completed
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto mt-4 -mx-6 px-6">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
