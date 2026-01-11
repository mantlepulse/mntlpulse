'use client'

/**
 * Participant Quests Page
 * Dashboard for participants to view and complete quests
 */

import { useAccount } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AvailableQuestsList } from '@/components/participant/quests/available-quests-list'
import { PointsBalanceCard } from '@/components/participant/quests/points-balance-card'
import { MembershipTierCard } from '@/components/participant/quests/membership-tier-card'
import { Target, Trophy, Sparkles, ListTodo } from 'lucide-react'

export default function ParticipantQuestsPage() {
  const { isConnected } = useAccount()

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="mt-8">
          <CardContent className="py-16 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Connect your wallet to view quests and earn points.
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
          <Sparkles className="w-8 h-8 text-primary" />
          Quests
        </h1>
        <p className="text-muted-foreground mt-1">
          Complete quests to earn points and convert them to PULSE rewards
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar - Points & Membership */}
        <div className="space-y-6 lg:col-span-1">
          <PointsBalanceCard />
          <MembershipTierCard />
        </div>

        {/* Main Content - Quests */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="w-5 h-5" />
                Available Quests
              </CardTitle>
              <CardDescription>
                Complete quests from creators to earn points
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AvailableQuestsList />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
