'use client'

/**
 * Membership Tier Card Component
 * Displays user's current membership tier and progress to next tier
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserMembership, useTierProgress, useVoteLimitInfo } from '@/hooks/use-membership'
import { Shield, Vote, Target, CheckCircle2, Award, ArrowUp } from 'lucide-react'

const tierColors: Record<string, string> = {
  bronze: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  silver: 'text-slate-600 bg-slate-100 dark:bg-slate-800/30',
  gold: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  platinum: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30',
}

const tierBorderColors: Record<string, string> = {
  bronze: 'border-amber-500/30',
  silver: 'border-slate-500/30',
  gold: 'border-yellow-500/30',
  platinum: 'border-violet-500/30',
}

export function MembershipTierCard() {
  const { data: membershipData, isLoading: membershipLoading } = useUserMembership()
  const { progress, isLoading: progressLoading } = useTierProgress()
  const { data: voteLimitInfo, isLoading: voteLimitLoading } = useVoteLimitInfo()

  const isLoading = membershipLoading || progressLoading || voteLimitLoading
  const tier = membershipData?.tier
  const membership = membershipData?.membership

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!tier || !membership) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Membership Tier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Connect your wallet to see your membership tier.</p>
        </CardContent>
      </Card>
    )
  }

  const tierSlug = tier.slug
  const votesUsed = voteLimitInfo?.todayVotes || 0
  const voteLimit = voteLimitInfo?.dailyLimit || tier.dailyVoteLimit
  const votesRemaining = voteLimit - votesUsed

  return (
    <Card className={tierBorderColors[tierSlug]}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Membership Tier
          </CardTitle>
          <Badge className={`${tierColors[tierSlug]} border-0`}>
            {tier.name}
          </Badge>
        </div>
        <CardDescription>
          Your daily vote limit and tier benefits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Daily Votes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Vote className="w-4 h-4" />
              Daily Votes
            </span>
            <span className="font-medium">
              {votesUsed} / {voteLimit}
            </span>
          </div>
          <Progress value={(votesUsed / voteLimit) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {votesRemaining > 0
              ? `${votesRemaining} votes remaining today`
              : 'Daily limit reached - resets at midnight UTC'}
          </p>
        </div>

        {/* Tier Benefits */}
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <p className="text-sm font-medium">Tier Benefits</p>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              {tier.dailyVoteLimit} votes per day
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              Up to {tier.maxSeasonPoints.toLocaleString()} points per season
            </li>
          </ul>
        </div>

        {/* Progress to Next Tier */}
        {progress && !progress.isMaxTier && progress.nextTier && progress.requirements && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Progress to {progress.nextTier.name}</span>
            </div>
            <div className="space-y-2">
              {Object.entries(progress.requirements).map(([key, req]) => {
                if (!req || req.required === 0) return null
                const percentage = Math.min(Math.round((req.current / req.required) * 100), 100)
                const label = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (str) => str.toUpperCase())

                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={req.met ? 'text-green-500' : ''}>
                        {req.current} / {req.required}
                        {req.met && <CheckCircle2 className="w-3 h-3 inline ml-1" />}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-1" />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {progress?.isMaxTier && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-500/10">
            <Award className="w-5 h-5 text-violet-500" />
            <span className="text-sm text-violet-600 dark:text-violet-400">
              You&apos;ve reached the highest tier!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
