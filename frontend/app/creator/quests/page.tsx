'use client'

/**
 * Creator Quests Page
 * Manage quests created by the creator for their audience
 */

import { useState } from 'react'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreatorBreadcrumb } from '@/components/creator/creator-breadcrumb'
import { CreatorQuestsList } from '@/components/creator/quests/creator-quests-list'
import { SeasonsList } from '@/components/creator/quests/seasons-list'
import { useCreatorQuests } from '@/hooks/use-creator-quests'
import { useCreatorSeasons } from '@/hooks/use-seasons'
import { Plus, Trophy, Calendar, Target, Sparkles, Users } from 'lucide-react'

export default function CreatorQuestsPage() {
  const { isConnected } = useAccount()
  const { data: quests, isLoading: questsLoading } = useCreatorQuests()
  const { data: seasons, isLoading: seasonsLoading } = useCreatorSeasons()
  const [activeTab, setActiveTab] = useState('quests')

  // Calculate stats
  const activeQuests = quests?.filter((q) => q.isActive).length || 0
  const totalCompletions = quests?.reduce((sum, q) => sum + q.currentCompletions, 0) || 0
  const activeSeasons = seasons?.filter((s) => s.status === 'active').length || 0

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <CreatorBreadcrumb />
        <Card className="mt-8">
          <CardContent className="py-16 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Connect your wallet to create and manage quests for your audience.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <CreatorBreadcrumb />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            Creator Quests
          </h1>
          <p className="text-muted-foreground mt-1">
            Create quests and seasons to engage your audience and reward participation
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/creator/quests/seasons/create">
              <Calendar className="w-4 h-4 mr-2" />
              New Season
            </Link>
          </Button>
          <Button asChild>
            <Link href="/creator/quests/create">
              <Plus className="w-4 h-4 mr-2" />
              Create Quest
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Quests</p>
                {questsLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{activeQuests}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Completions</p>
                {questsLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{totalCompletions}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Seasons</p>
                {seasonsLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{activeSeasons}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Quests</p>
                {questsLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{quests?.length || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Quests and Seasons */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="quests" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Quests
            {quests && quests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {quests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="seasons" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Seasons
            {seasons && seasons.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {seasons.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quests" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Quests</CardTitle>
              <CardDescription>
                Quests you've created for your audience. Track completions and manage rewards.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreatorQuestsList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasons" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Seasons</CardTitle>
              <CardDescription>
                Manage seasons/tournaments for point accumulation and PULSE distribution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SeasonsList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
