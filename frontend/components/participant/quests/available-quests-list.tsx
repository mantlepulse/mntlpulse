'use client'

/**
 * Available Quests List Component
 * Displays quests available for participants to complete
 */

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAvailableQuests, useUpdateQuestProgress } from '@/hooks/use-creator-quests'
import { QuestActionDialog } from './quest-action-dialog'
import { Search, Target, Trophy, Users, Clock, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  CreatorQuestWithParticipation,
  CreatorQuestType,
  CreatorQuestRequirementType,
} from '@/lib/api/creator-quests-client'

const questTypeLabels: Record<CreatorQuestType, string> = {
  participation: 'Participation',
  engagement_goal: 'Engagement Goal',
}

const requirementTypeLabels: Record<CreatorQuestRequirementType, string> = {
  vote_on_polls: 'Vote on Polls',
  vote_on_specific_poll: 'Vote on Specific Poll',
  share_poll: 'Share Poll',
  first_n_voters: 'First N Voters',
  participate_n_polls: 'Participate in Polls',
}

interface QuestCardProps {
  quest: CreatorQuestWithParticipation
  onClick?: () => void
}

function QuestCard({ quest, onClick }: QuestCardProps) {
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

  const getSlotsRemaining = () => {
    if (quest.maxCompletions === null) return null
    const remaining = quest.maxCompletions - quest.currentCompletions
    if (remaining <= 0) return 'No slots left'
    if (remaining <= 10) return `${remaining} slots left`
    return null
  }

  const timeRemaining = getTimeRemaining()
  const slotsRemaining = getSlotsRemaining()

  // Completed quests are not clickable per user requirement
  const isClickable = !isCompleted

  return (
    <Card
      className={`transition-all ${isCompleted ? 'bg-green-500/5 border-green-500/20' : ''} ${
        isClickable ? 'cursor-pointer hover:border-primary/50 hover:shadow-md' : ''
      }`}
      onClick={isClickable ? onClick : undefined}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {questTypeLabels[quest.questType]}
              </Badge>
              {isCompleted && (
                <Badge variant="default" className="bg-green-500 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">{quest.name}</CardTitle>
            <CardDescription className="mt-1">{quest.description}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-amber-500">
              <Trophy className="w-4 h-4" />
              <span className="font-bold">{quest.pointsReward}</span>
              <span className="text-xs text-muted-foreground">pts</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Requirement */}
          <div className="flex items-center gap-2 text-sm">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span>
              {requirementTypeLabels[quest.requirements.type]}:{' '}
              <span className="font-medium">{target}</span>
            </span>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {progress} / {target}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-2">
            {timeRemaining && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {timeRemaining}
              </div>
            )}
            {slotsRemaining && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                {slotsRemaining}
              </div>
            )}
            {quest.currentCompletions > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3 h-3" />
                {quest.currentCompletions} completed
              </div>
            )}
          </div>

          {/* Points Awarded or Click hint */}
          {isCompleted && participation?.pointsAwarded ? (
            <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg">
              <Sparkles className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">
                You earned <span className="font-bold">{participation.pointsAwarded}</span> points!
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-muted-foreground">Click to start quest</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function AvailableQuestsList() {
  const { data: quests, isLoading, error, refetch } = useAvailableQuests(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'available' | 'in_progress' | 'completed'>('all')
  const [selectedQuest, setSelectedQuest] = useState<CreatorQuestWithParticipation | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleQuestClick = (quest: CreatorQuestWithParticipation) => {
    setSelectedQuest(quest)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setSelectedQuest(null)
    }
  }

  const handleProgressUpdate = () => {
    // Refetch quests to update progress and close dialog
    refetch()
    setDialogOpen(false)
  }

  const filteredQuests = quests?.filter((quest) => {
    const matchesSearch = quest.name.toLowerCase().includes(searchQuery.toLowerCase())

    if (filter === 'all') return matchesSearch
    if (filter === 'completed') return matchesSearch && quest.participation?.isCompleted
    if (filter === 'in_progress') {
      return matchesSearch && quest.participation && !quest.participation.isCompleted
    }
    if (filter === 'available') {
      return matchesSearch && !quest.participation
    }
    return matchesSearch
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Failed to load quests. Please try again.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'available' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('available')}
          >
            Available
          </Button>
          <Button
            variant={filter === 'in_progress' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('in_progress')}
          >
            In Progress
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('completed')}
          >
            Completed
          </Button>
        </div>
      </div>

      {/* Quests Grid */}
      {!filteredQuests || filteredQuests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Target className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">
            {searchQuery || filter !== 'all' ? 'No quests found' : 'No quests available'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery || filter !== 'all'
              ? 'Try adjusting your filters'
              : 'Check back later for new quests from creators'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredQuests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              onClick={() => handleQuestClick(quest)}
            />
          ))}
        </div>
      )}

      {/* Quest Action Dialog */}
      <QuestActionDialog
        quest={selectedQuest}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onProgressUpdate={handleProgressUpdate}
      />
    </div>
  )
}
