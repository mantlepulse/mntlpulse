'use client'

/**
 * Participate In Polls Content Component
 * Shows polls user hasn't participated in yet
 */

import { useState, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { usePollsByCreator } from '@/hooks/use-polls-by-creator'
import { InlineVotingCard, InlineVotingCardSkeleton } from './inline-voting-card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, Search, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { CreatorQuestWithParticipation } from '@/lib/api/creator-quests-client'
import type { FormattedPoll } from '@/hooks/use-polls'

interface ParticipateInPollsContentProps {
  quest: CreatorQuestWithParticipation
  onProgressUpdate?: () => void
}

export function ParticipateInPollsContent({ quest, onProgressUpdate }: ParticipateInPollsContentProps) {
  const { address } = useAccount()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'available' | 'all'>('available')

  const {
    polls,
    loading,
    error,
  } = usePollsByCreator(quest.creatorAddress, 20)

  // Separate active polls from ended ones
  // For participation quests, we want to show active polls the user can participate in
  const { activePolls, endedPolls } = useMemo(() => {
    const active: FormattedPoll[] = []
    const ended: FormattedPoll[] = []

    polls.forEach(poll => {
      if (poll.status === 'active') {
        active.push(poll)
      } else {
        ended.push(poll)
      }
    })

    return { activePolls: active, endedPolls: ended }
  }, [polls])

  // Filter by search query
  const filteredActivePolls = activePolls.filter(poll =>
    poll.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  if (polls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">No Polls Available</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          This creator hasn't created any polls yet. Check back later!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Instruction */}
      <div className="text-sm text-muted-foreground">
        Participate in {quest.requirements.target} poll{quest.requirements.target > 1 ? 's' : ''} from this creator to complete the quest.
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'available' | 'all')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">
            Active ({activePolls.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({polls.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4 mt-4">
          {/* Search */}
          {activePolls.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search active polls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {/* Active Polls List */}
          {filteredActivePolls.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {searchQuery ? (
                <p>No polls match your search.</p>
              ) : (
                <>
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>No active polls available right now.</p>
                  <p className="text-xs mt-1">Check the "All" tab to see ended polls.</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivePolls.map((poll) => (
                <InlineVotingCard
                  key={poll.id}
                  poll={poll}
                  questId={quest.id}
                  onVoteSuccess={handleVoteSuccess}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4 mt-4">
          {/* All Polls List */}
          <div className="space-y-3">
            {polls.map((poll) => (
              <InlineVotingCard
                key={poll.id}
                poll={poll}
                questId={quest.id}
                onVoteSuccess={handleVoteSuccess}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Count Info */}
      <div className="text-xs text-muted-foreground text-center pt-2">
        {activePolls.length} active poll{activePolls.length !== 1 ? 's' : ''} available
      </div>
    </div>
  )
}
