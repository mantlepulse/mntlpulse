'use client'

/**
 * Points Balance Card Component
 * Displays user's points balance and season information
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useUserTotalPoints } from '@/hooks/use-points'
import { useActiveSeasons } from '@/hooks/use-seasons'
import { Trophy, Coins, TrendingUp, Award } from 'lucide-react'
import Link from 'next/link'

export function PointsBalanceCard() {
  const { data: totalPoints, isLoading: pointsLoading } = useUserTotalPoints()
  const { data: activeSeasons, isLoading: seasonsLoading } = useActiveSeasons()

  const isLoading = pointsLoading || seasonsLoading
  const currentSeason = activeSeasons?.[0] // Most recent active season

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Your Points
        </CardTitle>
        <CardDescription>
          Earn points by completing quests. Convert to PULSE at season end.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Points */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Points</p>
            <p className="text-4xl font-bold text-amber-500">
              {totalPoints?.totalPoints.toLocaleString() || '0'}
            </p>
          </div>
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Award className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        {/* Season Info */}
        {currentSeason && (
          <div className="p-4 rounded-lg bg-background/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{currentSeason.name}</span>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Coins className="w-4 h-4" />
                {parseFloat(currentSeason.totalPulsePool).toLocaleString()} PULSE Pool
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground">Total Points</p>
            <p className="text-xl font-semibold">{totalPoints?.totalPoints || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground">Seasons Participated</p>
            <p className="text-xl font-semibold">{totalPoints?.seasonCount || 0}</p>
          </div>
        </div>

        {/* Action */}
        <Button asChild className="w-full" variant="outline">
          <Link href="/participant/quests/rewards">
            <TrendingUp className="w-4 h-4 mr-2" />
            View Rewards History
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
