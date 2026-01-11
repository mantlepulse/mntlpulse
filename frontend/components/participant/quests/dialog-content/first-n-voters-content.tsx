'use client'

/**
 * First N Voters Content Component
 * Shows polls with available first-voter slots
 */

import { useState, useMemo } from 'react'
import { usePollsByCreator } from '@/hooks/use-polls-by-creator'
import { InlineVotingCard, InlineVotingCardSkeleton } from './inline-voting-card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Search, AlertCircle, Users, Zap } from 'lucide-react'
import type { CreatorQuestWithParticipation } from '@/lib/api/creator-quests-client'
import type { FormattedPoll } from '@/hooks/use-polls'

interface FirstNVotersContentProps {
  quest: CreatorQuestWithParticipation
  onProgressUpdate?: () => void
}

export function FirstNVotersContent({ quest, onProgressUpdate }: FirstNVotersContentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // The "N" in "First N Voters" - this is the target from requirements
  const firstNTarget = quest.requirements.target

  const {
    polls,
    loading,
    error,
  } = usePollsByCreator(quest.creatorAddress, 20)

  // Filter to active polls with available first-voter slots
  const pollsWithSlots = useMemo(() => {
    return polls
      .filter(poll => poll.status === 'active')
      .map(poll => ({
        ...poll,
        slotsRemaining: Math.max(0, firstNTarget - poll.totalVotes),
        hasSlots: poll.totalVotes < firstNTarget,
      }))
      .sort((a, b) => {
        // Sort by available slots (more slots first), then by total votes (fewer votes first)
        if (a.hasSlots && !b.hasSlots) return -1
        if (!a.hasSlots && b.hasSlots) return 1
        return a.totalVotes - b.totalVotes
      })
  }, [polls, firstNTarget])

  // Filter by search query
  const filteredPolls = pollsWithSlots.filter(poll =>
    poll.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pollsWithAvailableSlots = filteredPolls.filter(p => p.hasSlots)
  const pollsWithoutSlots = filteredPolls.filter(p => !p.hasSlots)

  const handleVoteSuccess = () => {
    onProgressUpdate?.()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-2">
          Loading polls...
        </div>
        {[...Array(3)].map((_, i) => (
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

  if (pollsWithSlots.length === 0) {
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
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertDescription>
          Be among the first <strong>{firstNTarget}</strong> voters on a poll to earn the reward!
          Polls with available slots are shown first.
        </AlertDescription>
      </Alert>

      {/* Search */}
      {pollsWithSlots.length > 3 && (
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

      {/* Polls with available slots */}
      {pollsWithAvailableSlots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
            <Users className="w-4 h-4" />
            Polls with slots available ({pollsWithAvailableSlots.length})
          </div>
          {pollsWithAvailableSlots.map((poll) => (
            <div key={poll.id} className="relative">
              <Badge
                variant="default"
                className="absolute -top-2 -right-2 z-10 bg-green-500"
              >
                {poll.slotsRemaining} slot{poll.slotsRemaining !== 1 ? 's' : ''} left
              </Badge>
              <InlineVotingCard
                poll={poll}
                questId={quest.id}
                onVoteSuccess={handleVoteSuccess}
              />
            </div>
          ))}
        </div>
      )}

      {/* Polls without slots */}
      {pollsWithoutSlots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="w-4 h-4" />
            No slots remaining ({pollsWithoutSlots.length})
          </div>
          {pollsWithoutSlots.map((poll) => (
            <div key={poll.id} className="opacity-60">
              <InlineVotingCard
                poll={poll}
                questId={quest.id}
                onVoteSuccess={handleVoteSuccess}
              />
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {filteredPolls.length === 0 && searchQuery && (
        <div className="py-8 text-center text-muted-foreground">
          <p>No polls match your search.</p>
        </div>
      )}

      {/* Summary */}
      <div className="text-xs text-muted-foreground text-center pt-2">
        {pollsWithAvailableSlots.length} poll{pollsWithAvailableSlots.length !== 1 ? 's' : ''} with available first-voter slots
      </div>
    </div>
  )
}
