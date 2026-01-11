/**
 * Donor Explore Page
 * Browse all polls available for funding
 */

"use client"

import { useState, useMemo } from "react"
import { useAccount, useChainId } from "wagmi"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Coins,
  Search,
  Filter,
  Clock,
  Users,
  Wallet,
  ChevronDown,
  RefreshCw,
  Loader2,
  Target,
  ArrowUpDown,
} from "lucide-react"
import { DonorBreadcrumb } from "@/components/donor/donor-breadcrumb"
import { CreatorHeaderBanner } from "@/components/creator/creator-header-banner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

type SortOption = "newest" | "ending-soon" | "most-votes" | "most-funded"
type FilterOption = "all" | "crowdfund" | "community"

export default function DonorExplorePage() {
  const { isConnected } = useAccount()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [filterBy, setFilterBy] = useState<FilterOption>("all")

  // Fund dialog states
  const [fundDialogPollId, setFundDialogPollId] = useState<number | null>(null)
  const [cryptoFundDialogPollId, setCryptoFundDialogPollId] = useState<string | null>(null)

  // Fetch all polls
  const { polls, loading, loadingMore, hasMore, loadMore } = usePollsData({ pageSize: 12 })

  // Filter polls that have funding enabled
  const fundablePolls = useMemo(() => {
    let filtered = polls.filter((poll) =>
      poll.status === "active" && poll.fundingType !== "none"
    )

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((poll) =>
        poll.title.toLowerCase().includes(query) ||
        poll.description?.toLowerCase().includes(query)
      )
    }

    // Apply funding type filter
    if (filterBy !== "all") {
      filtered = filtered.filter((poll) => poll.fundingType === filterBy)
    }

    // Apply sorting
    switch (sortBy) {
      case "ending-soon":
        filtered.sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime())
        break
      case "most-votes":
        filtered.sort((a, b) => b.totalVotes - a.totalVotes)
        break
      case "most-funded":
        filtered.sort((a, b) => Number(b.totalReward) - Number(a.totalReward))
        break
      case "newest":
      default:
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
    }

    return filtered
  }, [polls, searchQuery, sortBy, filterBy])

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <DonorBreadcrumb />

        {/* Header Banner */}
        <CreatorHeaderBanner
          title="Explore Polls"
          description="Discover polls that need funding and support causes you care about"
        />

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search polls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterBy} onValueChange={(v) => setFilterBy(v as FilterOption)}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="crowdfund">Crowdfunding</SelectItem>
                <SelectItem value="community">Community</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[160px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="ending-soon">Ending Soon</SelectItem>
                <SelectItem value="most-votes">Most Votes</SelectItem>
                <SelectItem value="most-funded">Most Funded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading..." : `${fundablePolls.length} polls available for funding`}
          </p>
        </div>

        {/* Polls Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-lg" />
            ))}
          </div>
        ) : fundablePolls.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No polls found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : "No polls are currently seeking funding"}
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {fundablePolls.map((poll) => {
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
                        <Badge variant="default" className="text-xs">
                          {poll.fundingType === "crowdfund" ? "Crowdfunding" : "Community"}
                        </Badge>
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
                    "Load More Polls"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fund with Token Dialog */}
      {fundDialogPollId !== null && (
        <FundWithTokenDialog
          open={fundDialogPollId !== null}
          onOpenChange={(open) => !open && setFundDialogPollId(null)}
          pollId={fundDialogPollId}
          pollTitle={fundablePolls.find(p => parseInt(p.id) === fundDialogPollId)?.title || ""}
          pollFundingToken={fundablePolls.find(p => parseInt(p.id) === fundDialogPollId)?.fundingToken}
        />
      )}

      {/* Fund with Crypto Dialog (SideShift) */}
      {cryptoFundDialogPollId !== null && (
        <FundPollDialog
          open={cryptoFundDialogPollId !== null}
          onOpenChange={(open) => !open && setCryptoFundDialogPollId(null)}
          pollId={cryptoFundDialogPollId}
          pollFundingToken={fundablePolls.find(p => p.id === cryptoFundDialogPollId)?.fundingToken}
        />
      )}
    </div>
  )
}
