'use client'

/**
 * Participant Membership Page
 * View membership tier, benefits, and progress to next tier
 */

import { useAccount } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useUserMembership, useTierProgress, useVoteLimitInfo, useMembershipTiers } from '@/hooks/use-membership'
import { Shield, Vote, CheckCircle2, ArrowUp, Award, Trophy, Target, Calendar } from 'lucide-react'

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  bronze: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' },
  silver: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/30' },
  gold: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/30' },
  platinum: { bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-500/30' },
}

export default function ParticipantMembershipPage() {
  const { isConnected } = useAccount()
  const { data: membershipData, isLoading: membershipLoading } = useUserMembership()
  const { progress, isLoading: progressLoading } = useTierProgress()
  const { data: voteLimitInfo, isLoading: voteLimitLoading } = useVoteLimitInfo()
  const { data: allTiers, isLoading: tiersLoading } = useMembershipTiers()

  const isLoading = membershipLoading || progressLoading || voteLimitLoading || tiersLoading
  const tier = membershipData?.tier
  const membership = membershipData?.membership
  const tierSlug = tier?.slug || 'bronze'
  const colors = tierColors[tierSlug] || tierColors.bronze

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="mt-8">
          <CardContent className="py-16 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Connect your wallet to view your membership tier.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          Membership
        </h1>
        <p className="text-muted-foreground mt-1">
          Your membership tier and benefits
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Current Tier Card */}
        <Card className={`lg:col-span-2 ${colors.border}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Current Tier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                {/* Tier Badge */}
                <div className="flex items-center gap-4">
                  <div className={`w-20 h-20 rounded-xl ${colors.bg} flex items-center justify-center`}>
                    <Shield className={`w-10 h-10 ${colors.text}`} />
                  </div>
                  <div>
                    <h2 className={`text-3xl font-bold ${colors.text} capitalize`}>
                      {tier?.name || 'Bronze'}
                    </h2>
                    <p className="text-muted-foreground">Member since {membership?.tierUpdatedAt ? new Date(membership.tierUpdatedAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>

                {/* Benefits */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Vote className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Daily Vote Limit</span>
                    </div>
                    <p className="text-2xl font-bold">{tier?.dailyVoteLimit || 3} votes/day</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="font-medium">Max Season Points</span>
                    </div>
                    <p className="text-2xl font-bold">{tier?.maxSeasonPoints?.toLocaleString() || 'N/A'}</p>
                  </div>
                </div>

                {/* Daily Vote Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Today's Votes</span>
                    <span className="font-medium">
                      {voteLimitInfo?.todayVotes || 0} / {voteLimitInfo?.dailyLimit || tier?.dailyVoteLimit || 3}
                    </span>
                  </div>
                  <Progress
                    value={((voteLimitInfo?.todayVotes || 0) / (voteLimitInfo?.dailyLimit || tier?.dailyVoteLimit || 3)) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {voteLimitInfo?.remaining || 0} votes remaining today
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Your Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Your Stats</CardTitle>
            <CardDescription>Activity that counts towards tier progression</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Polls Participated</span>
                  <span className="font-medium">{membership?.stats?.pollsParticipated || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Votes Cast</span>
                  <span className="font-medium">{membership?.stats?.totalVotesCast || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Polls Created</span>
                  <span className="font-medium">{membership?.stats?.pollsCreated || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Seasons Completed</span>
                  <span className="font-medium">{membership?.stats?.seasonsCompleted || 0}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress to Next Tier */}
      {progress && !progress.isMaxTier && progress.nextTier && progress.requirements && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUp className="w-5 h-5 text-primary" />
              Progress to {progress.nextTier.name}
            </CardTitle>
            <CardDescription>
              Complete these requirements to unlock the next tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(progress.requirements).map(([key, req]) => {
                if (!req || req.required === 0) return null
                const percentage = Math.min(Math.round((req.current / req.required) * 100), 100)
                const label = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (str) => str.toUpperCase())

                return (
                  <div key={key} className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{label}</span>
                      {req.met && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <div className="flex items-center justify-between text-sm">
                      <span className={req.met ? 'text-green-500' : 'text-muted-foreground'}>
                        {req.current} / {req.required}
                      </span>
                      <span className="text-muted-foreground">{percentage}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Max Tier Message */}
      {progress?.isMaxTier && (
        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
          <CardContent className="py-8 text-center">
            <Award className="w-12 h-12 mx-auto mb-4 text-violet-500" />
            <h3 className="text-xl font-bold mb-2">You've Reached the Highest Tier!</h3>
            <p className="text-muted-foreground">
              Congratulations! You're a Platinum member with maximum benefits.
            </p>
          </CardContent>
        </Card>
      )}

      {/* All Tiers */}
      <Card>
        <CardHeader>
          <CardTitle>All Membership Tiers</CardTitle>
          <CardDescription>Compare benefits across all tiers</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {allTiers?.map((t) => {
                const tColors = tierColors[t.slug] || tierColors.bronze
                const isCurrentTier = t.slug === tierSlug

                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-lg border ${isCurrentTier ? tColors.border + ' ring-2 ring-primary' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-8 h-8 rounded-lg ${tColors.bg} flex items-center justify-center`}>
                        <Shield className={`w-4 h-4 ${tColors.text}`} />
                      </div>
                      <span className={`font-bold ${tColors.text}`}>{t.name}</span>
                      {isCurrentTier && <Badge variant="default" className="ml-auto">Current</Badge>}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Daily Votes</span>
                        <span className="font-medium">{t.dailyVoteLimit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Season Pts</span>
                        <span className="font-medium">{t.maxSeasonPoints.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
