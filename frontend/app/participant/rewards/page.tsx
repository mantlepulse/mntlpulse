'use client'

/**
 * Participant Rewards History Page
 * View PULSE rewards from completed seasons
 */

import { useAccount } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useUnclaimedRewards } from '@/hooks/use-points'
import { Coins, Trophy, CheckCircle2, Clock, ExternalLink, History } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function ParticipantRewardsPage() {
  const { isConnected } = useAccount()
  const { data: rewardsData, isLoading } = useUnclaimedRewards()

  const unclaimedRewards = rewardsData?.unclaimed || []
  const totalUnclaimed = rewardsData?.totalUnclaimed || '0'

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="mt-8">
          <CardContent className="py-16 text-center">
            <Coins className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Connect your wallet to view your rewards.
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
          <History className="w-8 h-8 text-primary" />
          Rewards History
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your PULSE rewards from completed seasons
        </p>
      </div>

      {/* Unclaimed Rewards Overview */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Coins className="w-7 h-7 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Unclaimed PULSE</p>
                {isLoading ? (
                  <Skeleton className="h-10 w-32 mt-1" />
                ) : (
                  <p className="text-4xl font-bold text-amber-500">
                    {parseFloat(totalUnclaimed).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            {parseFloat(totalUnclaimed) > 0 && (
              <Badge variant="default" className="bg-amber-500">
                Ready to Claim
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unclaimed Rewards List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Unclaimed Rewards
          </CardTitle>
          <CardDescription>
            PULSE tokens available to claim from completed seasons
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : unclaimedRewards.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No unclaimed rewards</p>
              <p className="text-sm">Complete quests during active seasons to earn PULSE</p>
            </div>
          ) : (
            <div className="space-y-4">
              {unclaimedRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium">Season Reward</p>
                      <p className="text-sm text-muted-foreground">
                        {reward.totalPoints.toLocaleString()} points earned
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-500">
                      {parseFloat(reward.pulseEarned).toLocaleString()} PULSE
                    </p>
                    <Badge variant="outline" className="mt-1">Unclaimed</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How PULSE Rewards Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <span className="font-bold text-blue-500">1</span>
              </div>
              <h4 className="font-medium">Earn Points</h4>
              <p className="text-sm text-muted-foreground">
                Complete quests during active seasons to earn points
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <span className="font-bold text-purple-500">2</span>
              </div>
              <h4 className="font-medium">Season Ends</h4>
              <p className="text-sm text-muted-foreground">
                When a season ends, your points are converted to PULSE based on the pool size
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <span className="font-bold text-amber-500">3</span>
              </div>
              <h4 className="font-medium">Claim Rewards</h4>
              <p className="text-sm text-muted-foreground">
                Claim your PULSE tokens once the creator distributes rewards
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
