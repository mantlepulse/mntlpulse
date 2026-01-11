'use client'

/**
 * Participant Points Page
 * View detailed points information and history
 */

import { useAccount } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useUserTotalPoints, usePointsHistory } from '@/hooks/use-points'
import { useActiveSeasons } from '@/hooks/use-seasons'
import { Trophy, History, Calendar, TrendingUp, Coins } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function ParticipantPointsPage() {
  const { isConnected } = useAccount()
  const { data: totalPoints, isLoading: pointsLoading } = useUserTotalPoints()
  const { data: pointsHistory, isLoading: historyLoading } = usePointsHistory({ limit: 20 })
  const { data: activeSeasons, isLoading: seasonsLoading } = useActiveSeasons()

  const isLoading = pointsLoading || historyLoading || seasonsLoading

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="mt-8">
          <CardContent className="py-16 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Connect your wallet to view your points.
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
          <Trophy className="w-8 h-8 text-amber-500" />
          My Points
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your points and see how they convert to PULSE rewards
        </p>
      </div>

      {/* Points Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Points</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-24 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-amber-500">
                    {totalPoints?.totalPoints?.toLocaleString() || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Seasons Participated</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-12 mt-1" />
                ) : (
                  <p className="text-3xl font-bold">{totalPoints?.seasonCount || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Seasons</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-12 mt-1" />
                ) : (
                  <p className="text-3xl font-bold">{activeSeasons?.length || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Seasons */}
      {activeSeasons && activeSeasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              Active Seasons
            </CardTitle>
            <CardDescription>
              Seasons where you can earn points
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeSeasons.map((season) => (
                <div
                  key={season.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{season.name}</h4>
                    {season.description && (
                      <p className="text-sm text-muted-foreground">{season.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant="default">Active</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {parseFloat(season.totalPulsePool).toLocaleString()} PULSE Pool
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Points History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Points History
          </CardTitle>
          <CardDescription>
            Recent points transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !pointsHistory || pointsHistory.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No points history yet</p>
              <p className="text-sm">Complete quests to start earning points</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pointsHistory.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        transaction.amount > 0
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium capitalize">
                        {transaction.type.replace('_', ' ')}
                      </p>
                      {transaction.description && (
                        <p className="text-sm text-muted-foreground">{transaction.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold ${
                        transaction.amount > 0 ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {transaction.amount > 0 ? '+' : ''}
                      {transaction.amount} pts
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
