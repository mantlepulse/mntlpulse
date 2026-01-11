'use client'

/**
 * Vote On Specific Poll Content Component
 * Shows specific polls from quest requirements for voting
 */

import { usePollsByIds } from '@/hooks/use-polls-by-creator'
import { InlineVotingCard, InlineVotingCardSkeleton } from './inline-voting-card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BarChart3, AlertCircle } from 'lucide-react'
import type { CreatorQuestWithParticipation } from '@/lib/api/creator-quests-client'

interface VoteOnSpecificPollContentProps {
  quest: CreatorQuestWithParticipation
  onProgressUpdate?: () => void
}

export function VoteOnSpecificPollContent({ quest, onProgressUpdate }: VoteOnSpecificPollContentProps) {
  const pollIds = quest.specificPollIds || quest.requirements.pollIds || []

  // Fetch specific polls by their IDs
  const {
    polls: specificPolls,
    loading,
    error,
  } = usePollsByIds(pollIds)

  const handleVoteSuccess = () => {
    onProgressUpdate?.()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-2">
          Loading required polls...
        </div>
        {[...Array(Math.min(pollIds.length, 3))].map((_, i) => (
          <InlineVotingCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load polls. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  if (specificPolls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">Polls Not Found</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          The specific polls for this quest could not be found. They may have been removed.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Instruction */}
      <div className="text-sm text-muted-foreground">
        Vote on {pollIds.length === 1 ? 'this specific poll' : `these ${pollIds.length} specific polls`} to complete the quest.
      </div>

      {/* Polls List */}
      <div className="space-y-3">
        {specificPolls.map((poll) => (
          <InlineVotingCard
            key={poll.id}
            poll={poll}
            questId={quest.id}
            onVoteSuccess={handleVoteSuccess}
          />
        ))}
      </div>

      {/* Missing Polls Warning */}
      {specificPolls.length < pollIds.length && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {pollIds.length - specificPolls.length} poll(s) could not be found. They may have been removed or ended.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
