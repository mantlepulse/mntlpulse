"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Plus, Vote, Sparkles, FolderKanban, ListChecks } from "lucide-react"
import { useAccount, useChainId } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardStats } from "@/components/creator/dashboard-stats"
import { ResponsesOverviewChart } from "@/components/creator/responses-overview-chart"
import { ResponsesTimelineChart } from "@/components/creator/responses-timeline-chart"
import { PendingDistributionsCard } from "@/components/creator/pending-distributions-card"
import { fetchAnalyticsTrends } from "@/lib/api/analytics"
import { CreatorBreadcrumb } from "@/components/creator/creator-breadcrumb"
import { useCreatorDashboardData } from "@/hooks/use-creator-dashboard-data"

export default function CreatorPage() {
  const router = useRouter()
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [timelineDays, setTimelineDays] = useState(7)
  const [isLoadingTrends, setIsLoadingTrends] = useState(false)

  const { address, isConnected } = useAccount()
  const chainId = useChainId()

  // Use the new subgraph-powered hook for creator dashboard data
  const {
    stats,
    polls,
    loading: pollsLoading,
    error: pollsError,
  } = useCreatorDashboardData(address)

  // Calculate responses overview data from polls (include all polls, not just active)
  const responsesOverviewData = useMemo(() => {
    const optionVotes: { [key: string]: number } = {}

    polls.forEach((poll) => {
      poll.options.forEach((optionText, idx) => {
        const truncatedOption = optionText.slice(0, 20) // Truncate long options
        const voteCount = Number(poll.votes[idx] || BigInt(0))
        optionVotes[truncatedOption] = (optionVotes[truncatedOption] || 0) + voteCount
      })
    })

    return Object.entries(optionVotes)
      .map(([option, responses]) => ({ option, responses }))
      .sort((a, b) => b.responses - a.responses)
      .slice(0, 10) // Top 10 options
  }, [polls])

  // Fetch timeline data from backend API
  useEffect(() => {
    const loadTrends = async () => {
      setIsLoadingTrends(true)
      try {
        const trends = await fetchAnalyticsTrends(chainId, timelineDays)

        // Merge polls and distributions data by date
        const dateMap = new Map<string, { pollsCreated: number; distributionCount: number }>()

        // Add poll creation data
        trends.polls?.forEach((item) => {
          const existing = dateMap.get(item.date) || { pollsCreated: 0, distributionCount: 0 }
          dateMap.set(item.date, { ...existing, pollsCreated: item.pollsCreated })
        })

        // Add distribution data
        trends.distributions?.forEach((item) => {
          const existing = dateMap.get(item.date) || { pollsCreated: 0, distributionCount: 0 }
          dateMap.set(item.date, { ...existing, distributionCount: item.distributionCount })
        })

        // Convert to array and sort by date
        const dailyData = Array.from(dateMap.entries())
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date))

        // Transform for chart
        const chartData = dailyData.map((day, index) => ({
          date: day.date,
          responses: day.distributionCount,
          cumulative: dailyData
            .slice(0, index + 1)
            .reduce((sum, d) => sum + d.distributionCount, 0),
        }))

        setTimelineData(chartData)
      } catch (error) {
        console.error("Failed to load trends:", error)
        setTimelineData([])
      } finally {
        setIsLoadingTrends(false)
      }
    }

    if (isConnected) {
      loadTrends()
    }
  }, [chainId, timelineDays, isConnected])


  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-amber-800 dark:text-amber-200 mb-2">
              Wallet Not Connected
            </h2>
            <p className="text-amber-700 dark:text-amber-300">
              Please connect your wallet to view your creator dashboard.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <CreatorBreadcrumb />

        {/* Header with Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Creator Dashboard</h1>
            <p className="text-muted-foreground">
              Analytics and insights for your polls
            </p>
            {pollsError && (
              <div className="flex items-center gap-2 text-red-600 mt-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Error loading data: {pollsError.message}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push('/dapp/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Poll
            </Button>
            <Button variant="outline" onClick={() => router.push('/dapp/questionnaires/create')}>
              <ListChecks className="h-4 w-4 mr-2" />
              Create Questionnaire
            </Button>
            <Button variant="outline" onClick={() => router.push('/creator/quests/create')}>
              <Sparkles className="h-4 w-4 mr-2" />
              Create Quest
            </Button>
          </div>
        </div>

        {/* Quick Actions Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            onClick={() => router.push('/dapp/create')}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Vote className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Create Poll</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create a new poll to gather feedback and insights from your community
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            onClick={() => router.push('/dapp/questionnaires/create')}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <ListChecks className="h-5 w-5 text-green-500" />
                </div>
                <CardTitle className="text-lg">Create Questionnaire</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Group multiple polls for participants to answer together in sequence
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            onClick={() => router.push('/creator/quests/create')}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                </div>
                <CardTitle className="text-lg">Create Quest</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Design quests to incentivize participation and reward your community
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            onClick={() => router.push('/creator/projects/create')}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <FolderKanban className="h-5 w-5 text-purple-500" />
                </div>
                <CardTitle className="text-lg">Create Project</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Group polls into projects to organize and generate insights
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Stats */}
        <DashboardStats
          totalPolls={stats.totalPolls}
          totalResponses={stats.totalResponses}
          activePolls={stats.activePolls}
          totalFunded={stats.totalFunded}
          isLoading={pollsLoading}
        />

        {/* Pending Distributions */}
        <PendingDistributionsCard
          pendingCount={stats.pendingDistributions}
          isLoading={pollsLoading}
        />

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <ResponsesOverviewChart
            data={responsesOverviewData}
            isLoading={pollsLoading}
          />
          <ResponsesTimelineChart
            data={timelineData}
            isLoading={isLoadingTrends}
            onTimeRangeChange={setTimelineDays}
          />
        </div>
      </div>
    </div>
  )
}
