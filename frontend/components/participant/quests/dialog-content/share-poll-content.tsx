'use client'

/**
 * Share Poll Content Component
 * Shows polls to share and collects share proof
 */

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { usePollsByCreator } from '@/hooks/use-polls-by-creator'
import { ShareVerificationForm, SharePlatform } from './share-verification-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  AlertCircle,
  Share2,
  CheckCircle2,
  ArrowLeft,
  Users,
  Clock,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { CreatorQuestWithParticipation } from '@/lib/api/creator-quests-client'
import type { FormattedPoll } from '@/hooks/use-polls'

interface SharePollContentProps {
  quest: CreatorQuestWithParticipation
  onProgressUpdate?: () => void
}

export function SharePollContent({ quest, onProgressUpdate }: SharePollContentProps) {
  const { address } = useAccount()
  const [selectedPoll, setSelectedPoll] = useState<FormattedPoll | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sharedPolls, setSharedPolls] = useState<Set<string>>(new Set())

  const {
    polls,
    loading,
    error,
  } = usePollsByCreator(quest.creatorAddress, 20)

  // Filter to active polls
  const activePolls = polls.filter(poll => poll.status === 'active')

  // Build poll URL
  const getPollUrl = (pollId: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/dapp/poll/${pollId}`
  }

  const handleShareSubmit = async (platform: SharePlatform, shareUrl: string) => {
    if (!selectedPoll || !address) return

    setIsSubmitting(true)

    try {
      // TODO: Call API to submit share proof
      // For now, we'll simulate the API call
      const response = await fetch(`/api/creator-quests/${quest.id}/share-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId: selectedPoll.id,
          platform,
          shareUrl,
          participantAddress: address,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit share proof')
      }

      // Mark poll as shared locally
      setSharedPolls(prev => new Set([...prev, selectedPoll.id]))

      toast.success('Share submitted successfully!')

      // Go back to poll selection
      setSelectedPoll(null)

      // Notify parent to refresh progress
      onProgressUpdate?.()
    } catch (err) {
      console.error('Share submission failed:', err)
      toast.error('Failed to submit share proof. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-2">
          Loading polls...
        </div>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
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

  // Show share form for selected poll
  if (selectedPoll) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedPoll(null)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to poll selection
        </Button>

        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{selectedPoll.title}</p>
              <p className="text-xs text-muted-foreground">
                {selectedPoll.totalVotes} votes
              </p>
            </div>
            <Badge variant={selectedPoll.status === 'active' ? 'default' : 'secondary'}>
              {selectedPoll.status}
            </Badge>
          </div>
        </div>

        <ShareVerificationForm
          pollUrl={getPollUrl(selectedPoll.id)}
          pollTitle={selectedPoll.title}
          onSubmit={handleShareSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    )
  }

  // Show poll selection
  if (activePolls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">No Active Polls</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          This creator doesn't have any active polls to share right now.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Instruction */}
      <div className="text-sm text-muted-foreground">
        Share {quest.requirements.target} poll{quest.requirements.target > 1 ? 's' : ''} on social media to complete this quest.
        Select a poll below to get started.
      </div>

      {/* Poll Selection */}
      <div className="space-y-3">
        {activePolls.map((poll) => {
          const isShared = sharedPolls.has(poll.id)

          return (
            <Card
              key={poll.id}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                isShared ? 'border-green-500/30 bg-green-500/5' : ''
              }`}
              onClick={() => !isShared && setSelectedPoll(poll)}
            >
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
                        <span>
                          {formatDistanceToNow(new Date(poll.endsAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isShared ? (
                      <Badge variant="outline" className="text-green-500 border-green-500/50">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Shared
                      </Badge>
                    ) : (
                      <Badge variant="default">
                        <Share2 className="w-3 h-3 mr-1" />
                        Share
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      {/* Count Info */}
      <div className="text-xs text-muted-foreground text-center pt-2">
        {activePolls.length} active poll{activePolls.length !== 1 ? 's' : ''} available to share
      </div>
    </div>
  )
}
