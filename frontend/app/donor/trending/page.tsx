/**
 * Donor Trending Page
 * View trending and popular polls
 */

"use client"

import { useState, useMemo } from "react"
import { useAccount } from "wagmi"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Coins,
  TrendingUp,
  Clock,
  Users,
  Wallet,
  ChevronDown,
  RefreshCw,
  Loader2,
  Flame,
  Star,
  ArrowUp,
  Trophy,
} from "lucide-react"
import { DonorBreadcrumb } from "@/components/donor/donor-breadcrumb"
import { CreatorHeaderBanner } from "@/components/creator/creator-header-banner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FundWithTokenDialog } from "@/components/fund-with-token-dialog"
import { FundPollDialog } from "@/components/sideshift/fund-poll-dialog"
import { usePollsData } from "@/hooks/use-polls-data"
import { formatRewardDisplay } from "@/lib/utils/format-reward"

type TrendingTab = "hot" | "top-funded" | "most-votes" | "ending-soon"

export default function DonorTrendingPage() {
  const { isConnected } = useAccount()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TrendingTab>("hot")

  // Fund dialog states
  const [fundDialogPollId, setFundDialogPollId] = useState<number | null>(null)
  const [cryptoFundDialogPollId, setCryptoFundDialogPollId] = useState<string | null>(null)

  // Fetch all polls
  const { polls, loading, loadingMore, hasMore, loadMore } = usePollsData({ pageSize: 20 })

  // Filter and sort polls based on active tab
  const trendingPolls = useMemo(() => {
    // Only show active polls with funding
    let filtered = polls.filter((poll) =>
      poll.status === "active" && poll.fundingType !== "none"
    )

    switch (activeTab) {
      case "hot":
        // Hot = combination of recent votes and funding activity
        // For now, sort by total votes * recency factor
        filtered.sort((a, b) => {
          const aScore = a.totalVotes * (1 / Math.max(1, (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
          const bScore = b.totalVotes * (1 / Math.max(1, (Date.now() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
          return bScore - aScore
        })
        break
      case "top-funded":
        filtered.sort((a, b) => Number(b.totalReward) - Number(a.totalReward))
        break
      case "most-votes":
        filtered.sort((a, b) => b.totalVotes - a.totalVotes)
        break
      case "ending-soon":
        filtered.sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime())
        break
    }

    return filtered.slice(0, 12)
  }, [polls, activeTab])

  // Top 3 polls for featured section
  const featuredPolls = useMemo(() => {
    return [...polls]
      .filter((poll) => poll.status === "active" && poll.fundingType !== "none")
      .sort((a, b) => Number(b.totalReward) - Number(a.totalReward))
      .slice(0, 3)
  }, [polls])

  // Show wallet connection warning if not connected
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <DonorBreadcrumb />
          <div className="flex items-center gap-2 rounded-lg border border-warning bg-warning/10 p-4">
            <AlertCircle className="h-5 w-5 text-warning" />
            <p className="text-sm">
              Please connect your wallet to access donor features
            </p>
          </div>
        </div>
      </div>
    )
  }

  const getTabIcon = (tab: TrendingTab) => {
    switch (tab) {
      case "hot":
        return <Flame className="h-4 w-4" />
      case "top-funded":
        return <Trophy className="h-4 w-4" />
      case "most-votes":
        return <Users className="h-4 w-4" />
      case "ending-soon":
        return <Clock className="h-4 w-4" />
    }
  }

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold shadow-lg">
            1
          </div>
        )
      case 1:
        return (
          <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold shadow-lg">
            2
          </div>
        )
      case 2:
        return (
          <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-white font-bold shadow-lg">
            3
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <DonorBreadcrumb />

        {/* Header Banner */}
        <CreatorHeaderBanner
          title="Trending Polls"
          description="Discover the most popular polls attracting community attention"
        />

        {/* Featured Top 3 */}
        {!loading && featuredPolls.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold">Top Funded Polls</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {featuredPolls.map((poll, index) => {
                const fundingGoal = Number(poll.totalReward) * 2 || 1000000000000000000n
                const currentFunding = Number(poll.totalReward) || 0
                const fundingProgress = Math.min((currentFunding / Number(fundingGoal)) * 100, 100)

                return (
                  <Card
                    key={poll.id}
                    className="relative hover:border-primary/50 hover:shadow-md transition-all border-2"
                  >
                    {getRankBadge(index)}
                    <CardHeader className="pb-2 pt-6">
                      <div className="flex items-center justify-between">
                        <Badge variant="default" className="text-xs">
                          {poll.fundingType === "crowdfund" ? "Crowdfunding" : "Community"}
                        </Badge>
                        <div className="flex items-center gap-1 text-green-500">
                          <Coins className="w-4 h-4" />
                          <span className="font-bold">
                            {formatRewardDisplay(poll.totalReward, poll.fundingToken)}
                          </span>
                        </div>
                      </div>
                      <CardTitle className="text-lg line-clamp-2 mt-2">{poll.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Funding</span>
                            <span className="font-medium">{Math.round(fundingProgress)}%</span>
                          </div>
                          <Progress value={fundingProgress} className="h-2" />
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{poll.totalVotes} votes</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ArrowUp className="w-4 h-4 text-green-500" />
                            <span className="text-green-500">Trending</span>
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => router.push(`/dapp/poll/${poll.id}`)}
                        >
                          View Poll
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Trending Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TrendingTab)}>
          <TabsList className="grid w-full grid-cols-4 max-w-xl">
            <TabsTrigger value="hot" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              <span className="hidden sm:inline">Hot</span>
            </TabsTrigger>
            <TabsTrigger value="top-funded" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Top Funded</span>
            </TabsTrigger>
            <TabsTrigger value="most-votes" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Most Votes</span>
            </TabsTrigger>
            <TabsTrigger value="ending-soon" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Ending Soon</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-56 w-full rounded-lg" />
                ))}
              </div>
            ) : trendingPolls.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No trending polls</h3>
                  <p className="text-muted-foreground">
                    Check back later for trending polls
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {trendingPolls.map((poll, index) => {
                    const fundingGoal = Number(poll.totalReward) * 2 || 1000000000000000000n
                    const currentFunding = Number(poll.totalReward) || 0
                    const fundingProgress = Math.min((currentFunding / Number(fundingGoal)) * 100, 100)

                    return (
                      <Card
                        key={poll.id}
                        className="hover:border-primary/50 hover:shadow-md transition-all"
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground">
                                #{index + 1}
                              </span>
                              <Badge variant="default" className="text-xs">
                                {poll.fundingType === "crowdfund" ? "Crowdfunding" : "Community"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-green-500">
                              <Coins className="w-3 h-3" />
                              <span className="font-bold text-xs">
                                {formatRewardDisplay(poll.totalReward, poll.fundingToken)}
                              </span>
                            </div>
                          </div>
                          <CardTitle className="text-lg line-clamp-2 mt-2">{poll.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Funding Progress</span>
                                <span className="font-medium">{Math.round(fundingProgress)}%</span>
                              </div>
                              <Progress value={fundingProgress} className="h-2" />
                            </div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>{poll.totalVotes} votes</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(poll.endsAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => router.push(`/dapp/poll/${poll.id}`)}
                              >
                                View Details
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" className="flex-1">
                                    <Coins className="h-4 w-4 mr-2" />
                                    Fund
                                    <ChevronDown className="h-3 w-3 ml-2" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuItem
                                    onClick={() => setFundDialogPollId(parseInt(poll.id))}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-start gap-3 py-1">
                                      <Wallet className="h-4 w-4 mt-0.5" />
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-medium text-sm">Fund with Mantle Tokens</span>
                                        <span className="text-xs opacity-70">Use PULSE/USDC on Mantle</span>
                                      </div>
                                    </div>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setCryptoFundDialogPollId(poll.id)}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-start gap-3 py-1">
                                      <RefreshCw className="h-4 w-4 mt-0.5" />
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-medium text-sm">Convert & Fund</span>
                                        <span className="text-xs opacity-70">Any crypto via SideShift</span>
                                      </div>
                                    </div>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load More"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Fund with Token Dialog */}
      {fundDialogPollId !== null && (
        <FundWithTokenDialog
          open={fundDialogPollId !== null}
          onOpenChange={(open) => !open && setFundDialogPollId(null)}
          pollId={fundDialogPollId}
          pollTitle={trendingPolls.find(p => parseInt(p.id) === fundDialogPollId)?.title || ""}
          pollFundingToken={trendingPolls.find(p => parseInt(p.id) === fundDialogPollId)?.fundingToken}
        />
      )}

      {/* Fund with Crypto Dialog (SideShift) */}
      {cryptoFundDialogPollId !== null && (
        <FundPollDialog
          open={cryptoFundDialogPollId !== null}
          onOpenChange={(open) => !open && setCryptoFundDialogPollId(null)}
          pollId={cryptoFundDialogPollId}
          pollFundingToken={trendingPolls.find(p => p.id === cryptoFundDialogPollId)?.fundingToken}
        />
      )}
    </div>
  )
}
