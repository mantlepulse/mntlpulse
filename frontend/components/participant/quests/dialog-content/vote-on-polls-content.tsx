'use client'

/**
 * Vote On Polls Content Component
 * Shows creator's active polls for voting within the quest dialog
 */

import { useState } from 'react'
import { usePollsByCreator } from '@/hooks/use-polls-by-creator'
import { InlineVotingCard, InlineVotingCardSkeleton } from './inline-voting-card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { BarChart3, Search, AlertCircle } from 'lucide-react'
import type { CreatorQuestWithParticipation } from '@/lib/api/creator-quests-client'

interface VoteOnPollsContentProps {
  quest: CreatorQuestWithParticipation
  onProgressUpdate?: () => void
}

export function VoteOnPollsContent({ quest, onProgressUpdate }: VoteOnPollsContentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch polls - always call hook with creator address (can be undefined for all polls)
  const {
    polls,
    loading,
    error,
  } = usePollsByCreator(quest.creatorAddress, 20)

  // Filter to only show active polls
  const activePolls = polls.filter(poll => poll.status === 'active')

  // Filter by search query
  const filteredPolls = activePolls.filter(poll =>
    poll.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleVoteSuccess = () => {
    onProgressUpdate?.()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-2">
          Loading polls from creator...
        </div>
        {[...Array(3)].map((_, i) => (
          <InlineVotingCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    console.error('Failed to load polls:', error)
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load polls. Please try again.
          {process.env.NODE_ENV === 'development' && (
            <span className="block text-xs mt-1 opacity-70">
              {error.message || 'Unknown error'}
            </span>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (activePolls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">No Active Polls</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          This creator doesn't have any active polls right now. Check back later!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Instruction */}
      <div className="text-sm text-muted-foreground">
        Vote on {quest.requirements.target} poll{quest.requirements.target > 1 ? 's' : ''} from this creator to complete the quest.
      </div>

      {/* Search */}
      {activePolls.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search polls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Polls List */}
      {filteredPolls.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <p>No polls match your search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPolls.map((poll) => (
            <InlineVotingCard
              key={poll.id}
              poll={poll}
              questId={quest.id}
              onVoteSuccess={handleVoteSuccess}
            />
          ))}
        </div>
      )}

      {/* Count Info */}
      <div className="text-xs text-muted-foreground text-center pt-2">
        Showing {filteredPolls.length} of {activePolls.length} active polls
      </div>
    </div>
  )
}
