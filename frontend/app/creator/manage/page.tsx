/**
 * Manage Polls Page
 * Dedicated page for managing all creator's polls
 */

"use client"

import { useState, useMemo, useEffect } from "react"
import { useAccount, useChainId } from "wagmi"
import { AlertCircle, Plus, LayoutGrid, Table, Archive, RefreshCw, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { TOKEN_INFO } from "@/lib/contracts/token-config"
import {
  useActivePolls,
  usePoll,
  useClosePoll,
  useSetDistributionMode,
  useWithdrawFunds,
  useDistributeRewards,
} from "@/lib/contracts/polls-contract-utils"
import { toast } from "sonner"
import { ManagePollsTab } from "@/components/creator/manage-polls-tab"
import { CreatorBreadcrumb } from "@/components/creator/creator-breadcrumb"
import { CreatorHeaderBanner } from "@/components/creator/creator-header-banner"
import { DashboardStats } from "@/components/creator/dashboard-stats"
import { PollCard } from "@/components/creator/poll-card"
import { DraggablePollCard } from "@/components/creator/projects/draggable-poll-card"
import { ProjectSidebar } from "@/components/creator/projects/project-sidebar"
import { DnDContextProvider } from "@/lib/dnd/dnd-context"
import { useAddPollToProject } from "@/hooks/use-projects"
import { parsePollDragId } from "@/lib/dnd/dnd-utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getTokenSymbol } from "@/lib/contracts/token-config"
import { useClosedPolls } from "@/hooks/use-closed-polls"
import { useClosedPollsContract } from "@/hooks/use-closed-polls-contract"
import { ClosedPollCard } from "@/components/creator/closed-poll-card"
import type { DragEndEvent } from '@dnd-kit/core'

export default function ManagePollsPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const router = useRouter()
  const { data: activePollIds, isLoading: pollsLoading, refetch: refetchActivePolls } = useActivePolls()
  const { closePoll, isSuccess: isCloseSuccess, isConfirming: isCloseConfirming } = useClosePoll()
  const { setDistributionMode, isSuccess: isDistributionModeSuccess } = useSetDistributionMode()
  const { withdrawFunds, isSuccess: isWithdrawSuccess } = useWithdrawFunds()
  const { distributeRewards } = useDistributeRewards()
  const addPollToProject = useAddPollToProject()

  // Fetch closed polls from subgraph (primary source)
  const { polls: closedPollsSubgraph, loading: closedPollsSubgraphLoading, error: closedPollsSubgraphError, refetch: refetchClosedPollsSubgraph } = useClosedPolls(address, chainId)

  // Fetch closed polls from contract (fallback source)
  const { polls: closedPollsContract, loading: closedPollsContractLoading, refetch: refetchClosedPollsContract } = useClosedPollsContract(address, chainId)

  // Merge both sources - use all polls from both, deduplicated by pollId
  const closedPolls = useMemo(() => {
    const pollMap = new Map<number, typeof closedPollsSubgraph[0]>()

    // Add contract polls first (lower priority)
    closedPollsContract.forEach(poll => {
      pollMap.set(poll.pollId, poll)
    })

    // Add subgraph polls (higher priority, will override contract data)
    closedPollsSubgraph.forEach(poll => {
      pollMap.set(poll.pollId, poll)
    })

    // Convert to array and sort by endTime descending
    return Array.from(pollMap.values()).sort((a, b) => b.endTime - a.endTime)
  }, [closedPollsSubgraph, closedPollsContract])

  const closedPollsLoading = closedPollsSubgraphLoading && closedPollsContractLoading

  // Determine data source for display
  const usingContractOnly = closedPollsSubgraph.length === 0 && closedPollsContract.length > 0 && !closedPollsSubgraphLoading
  const hasSubgraphError = !!closedPollsSubgraphError

  // Refetch both sources
  const refetchClosedPolls = () => {
    refetchClosedPollsSubgraph()
    refetchClosedPollsContract()
    return refetchClosedPollsSubgraph() // Return promise for polling
  }

  // View toggle state with localStorage persistence
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards")

  // Display titles for polls (off-chain overrides)
  const [displayTitles, setDisplayTitles] = useState<Record<string, string | null>>({})

  // Track poll being closed for refetch
  const [closingPollId, setClosingPollId] = useState<bigint | null>(null)
  // Track if we're waiting for subgraph to sync
  const [isWaitingForSync, setIsWaitingForSync] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("manage-polls-view")
    if (stored === "table" || stored === "cards") {
      setViewMode(stored)
    }
  }, [])

  const toggleView = (mode: "table" | "cards") => {
    setViewMode(mode)
    localStorage.setItem("manage-polls-view", mode)
  }

  // Fetch all polls (up to 10)
  const pollQueries = Array.from({ length: 10 }, (_, i) =>
    usePoll(activePollIds?.[i] ? Number(activePollIds[i]) : 0)
  )

  // Filter and format polls created by current user
  const myPolls = useMemo(() => {
    if (!activePollIds || !address) return []

    return activePollIds
      .slice(0, 10)
      .map((pollId: bigint, index: number) => {
        const pollData = pollQueries[index]
        if (!pollData.data) return null

        const [id, question, options, votes, endTime, isActive, creator, totalFunding, distributionMode, fundingToken, fundingType] = pollData.data

        // Only include polls created by current user
        if (creator.toLowerCase() !== address.toLowerCase()) return null

        // Get token symbol from address
        const fundingTokenSymbol = getTokenSymbol(chainId, fundingToken) || "ETH"

        return {
          id,
          question,
          isActive,
          totalVotes: votes.reduce((sum: bigint, vote: bigint) => sum + vote, BigInt(0)),
          totalFunding,
          endTime,
          distributionMode: distributionMode as 0 | 1 | 2, // From contract
          fundingToken,
          fundingTokenSymbol,
          options: options.map((text: string, index: number) => ({
            text,
            votes: votes[index],
          })),
          balances: [], // TODO: Fetch token balances
          voters: [], // TODO: Fetch voters
        }
      })
      .filter(Boolean)
  }, [activePollIds, address, chainId, pollQueries])

  // Fetch display titles when polls change
  useEffect(() => {
    async function fetchDisplayTitles() {
      if (!myPolls.length || !chainId) return

      try {
        const pollIds = myPolls.map(p => p.id.toString()).join(',')
        const response = await fetch(`/api/polls/display-titles?chainId=${chainId}&pollIds=${pollIds}`)

        if (response.ok) {
          const data = await response.json()
          setDisplayTitles(data.displayTitles || {})
        }
      } catch (error) {
        console.error('Failed to fetch display titles:', error)
      }
    }

    fetchDisplayTitles()
  }, [myPolls, chainId])

  // Refetch polls when close or distribution mode transaction succeeds
  useEffect(() => {
    if (isCloseSuccess && closingPollId) {
      toast.success("Poll closed successfully! The closed poll will appear shortly after indexing.")
      // Refetch all poll queries to get updated data
      pollQueries.forEach(query => query.refetch())
      refetchActivePolls()
      setIsWaitingForSync(true)

      // Poll the subgraph until the closed poll appears (indexing can take 10-60 seconds)
      const pollIdToFind = closingPollId
      let attempts = 0
      const maxAttempts = 12 // Try for up to 60 seconds (12 * 5s)

      const pollForClosedPoll = async () => {
        attempts++
        const result = await refetchClosedPolls()

        // Check if the closed poll is now in the list
        // The refetch function from Apollo returns ApolloQueryResult
        const foundPoll = (result as any)?.data?.polls?.some(
          (p: { pollId: string }) => parseInt(p.pollId, 10) === Number(pollIdToFind)
        )

        if (foundPoll) {
          toast.success("Closed poll is now visible!")
          setClosingPollId(null)
          setIsWaitingForSync(false)
          return
        }

        if (attempts < maxAttempts) {
          // Retry in 5 seconds
          setTimeout(pollForClosedPoll, 5000)
        } else {
          toast.info("Subgraph is still indexing. The closed poll may take a few more minutes to appear.")
          setClosingPollId(null)
          setIsWaitingForSync(false)
        }
      }

      // Start polling after initial 5 second delay
      setTimeout(pollForClosedPoll, 5000)
    }
  }, [isCloseSuccess])

  useEffect(() => {
    if (isDistributionModeSuccess) {
      toast.success("Distribution mode updated successfully!")
      pollQueries.forEach(query => query.refetch())
    }
  }, [isDistributionModeSuccess])

  // Refetch when funds are withdrawn
  useEffect(() => {
    if (isWithdrawSuccess) {
      toast.success("Funds withdrawn successfully!")
      refetchClosedPolls()
    }
  }, [isWithdrawSuccess])

  // Handle title update
  const handleTitleUpdate = (pollId: bigint, newTitle: string) => {
    setDisplayTitles(prev => ({
      ...prev,
      [pollId.toString()]: newTitle,
    }))
  }

  // Calculate dashboard stats
  const dashboardStats = useMemo(() => {
    const totalPolls = myPolls.length
    const activePolls = myPolls.filter((p) => p.isActive).length
    const totalResponses = myPolls.reduce(
      (sum, poll) => sum + Number(poll.totalVotes),
      0
    )

    // Group funding by token symbol with correct decimals
    const fundingByToken: Record<string, number> = {}
    myPolls.forEach((poll) => {
      const symbol = poll.fundingTokenSymbol || "ETH"
      const decimals = TOKEN_INFO[symbol]?.decimals || 18
      const amount = Number(poll.totalFunding) / Math.pow(10, decimals)
      fundingByToken[symbol] = (fundingByToken[symbol] || 0) + amount
    })

    // Format as "0.5 ETH, 100 USDC" or just the single token
    const fundedDisplay = Object.entries(fundingByToken)
      .filter(([_, amount]) => amount > 0)
      .map(([symbol, amount]) => `${amount.toFixed(4)} ${symbol}`)
      .join(", ") || "0 ETH"

    return {
      totalPolls,
      activePolls,
      totalResponses,
      totalFunded: fundedDisplay,
    }
  }, [myPolls])

  const handleSetDistributionMode = async (pollId: bigint, mode: number) => {
    try {
      await setDistributionMode(Number(pollId), mode)
      toast.success("Distribution mode update transaction submitted")
    } catch (error) {
      console.error("Set distribution mode failed:", error)
      toast.error("Failed to update distribution mode")
    }
  }

  const handleWithdrawFunds = async (pollId: bigint, recipient: string, tokens: string[]) => {
    try {
      await withdrawFunds(Number(pollId), recipient as `0x${string}`, tokens as `0x${string}`[])
      toast.success("Withdraw funds transaction submitted")
    } catch (error) {
      console.error("Withdraw funds failed:", error)
      toast.error("Failed to withdraw funds")
    }
  }

  const handleDistributeRewards = async (
    pollId: bigint,
    token: string,
    recipients: string[],
    amounts: string[]
  ) => {
    try {
      const amountsBigInt = amounts.map(a => BigInt(a))
      await distributeRewards(
        Number(pollId),
        token as `0x${string}`,
        recipients as `0x${string}`[],
        amountsBigInt
      )
      toast.success("Distribute rewards transaction submitted")
    } catch (error) {
      console.error("Distribute rewards failed:", error)
      toast.error("Failed to distribute rewards")
    }
  }

  const handleClosePoll = async (pollId: bigint) => {
    try {
      setClosingPollId(pollId)
      await closePoll(Number(pollId))
      toast.success("Poll close transaction submitted. Waiting for confirmation...")
    } catch (error) {
      console.error("Close poll failed:", error)
      toast.error("Failed to close poll")
      setClosingPollId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    // Parse poll data from drag ID
    const pollData = parsePollDragId(active.id.toString())
    if (!pollData) return

    // Extract project ID from drop zone ID
    const projectId = over.id.toString().replace('project-', '')

    try {
      await addPollToProject.mutateAsync({
        projectId,
        chainId: pollData.chainId,
        pollId: pollData.pollId,
      })
      toast.success('Poll added to project')
    } catch (error) {
      toast.error('Failed to add poll to project')
    }
  }

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
              Please connect your wallet to manage your polls.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DnDContextProvider onDragEnd={handleDragEnd}>
      <div className="flex h-screen">
        {/* Project Sidebar */}
        <ProjectSidebar
          onCreateProject={() => router.push('/creator/projects/create')}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Breadcrumb */}
              <CreatorBreadcrumb />

              {/* Header Banner */}
              <CreatorHeaderBanner
                title="Manage Polls"
                description="Manage your polls and track their performance"
              />

              {/* Stats */}
              <DashboardStats
                totalPolls={dashboardStats.totalPolls}
                totalResponses={dashboardStats.totalResponses}
                activePolls={dashboardStats.activePolls}
                totalFunded={dashboardStats.totalFunded}
                isLoading={pollsLoading}
              />

        {/* My Polls Section with Tabs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">My Polls</h2>
              <p className="text-sm text-muted-foreground">
                Manage your polls and track their performance
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* New Poll Button */}
              <Button onClick={() => router.push("/dapp/create")}>
                <Plus className="h-4 w-4 mr-2" />
                New Poll
              </Button>
            </div>
          </div>

          <Tabs defaultValue="active" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="active" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Active Polls
                  {myPolls.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                      {myPolls.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="closed" className="gap-2">
                  <Archive className="h-4 w-4" />
                  Closed Polls
                  {closedPolls.length > 0 && (
                    <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                      {closedPolls.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* View Toggle */}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => toggleView("cards")}
                  className="rounded-r-none"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => toggleView("table")}
                  className="rounded-l-none"
                >
                  <Table className="h-4 w-4 mr-2" />
                  Table
                </Button>
              </div>
            </div>

            {/* Active Polls Tab */}
            <TabsContent value="active" className="mt-0">
              {viewMode === "cards" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {myPolls.length === 0 ? (
                    <div className="col-span-2 text-center py-12 text-muted-foreground">
                      No active polls found. Create your first poll to get started.
                    </div>
                  ) : (
                    myPolls.map((poll) => (
                      <DraggablePollCard
                        key={Number(poll.id)}
                        poll={{
                          id: String(poll.id),
                          pollId: Number(poll.id),
                          question: poll.question,
                          options: poll.options.map((opt: { text: string }) => opt.text),
                          votes: poll.options.map((opt: { votes: bigint }) => opt.votes),
                          totalVotes: Number(poll.totalVotes),
                          endTime: Number(poll.endTime),
                          isActive: poll.isActive,
                          totalFunding: poll.totalFunding,
                          totalFundingAmount: poll.totalFunding,
                          voteCount: poll.options.reduce((sum: number, opt: { votes: bigint }) => sum + Number(opt.votes), 0),
                          voterCount: 0,
                          distributionMode: poll.distributionMode,
                          fundingType: 'community',
                          status: poll.isActive ? 'active' : 'closed',
                          createdAt: new Date(),
                          fundingToken: poll.fundingToken,
                          fundingTokenSymbol: poll.fundingTokenSymbol,
                        }}
                        chainId={chainId}
                        creatorAddress={address || ''}
                        displayTitle={displayTitles[poll.id.toString()]}
                        onClosePoll={handleClosePoll}
                        onSetDistributionMode={handleSetDistributionMode}
                        onTitleUpdate={handleTitleUpdate}
                      />
                    ))
                  )}
                </div>
              ) : (
                <ManagePollsTab
                  polls={myPolls}
                  isLoading={pollsLoading}
                  onSetDistributionMode={handleSetDistributionMode}
                  onWithdrawFunds={handleWithdrawFunds}
                  onDistributeRewards={handleDistributeRewards}
                  onClosePoll={handleClosePoll}
                />
              )}
            </TabsContent>

            {/* Closed Polls Tab */}
            <TabsContent value="closed" className="mt-0">
              {/* Syncing indicator and refresh button */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {isWaitingForSync ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Waiting for subgraph to index closed poll...</span>
                    </>
                  ) : hasSubgraphError ? (
                    <span className="text-xs text-red-600">Subgraph error - using contract data</span>
                  ) : usingContractOnly ? (
                    <span className="text-xs text-amber-600">
                      Subgraph returned 0 polls - showing {closedPollsContract.length} from contract
                    </span>
                  ) : closedPollsSubgraph.length > 0 ? (
                    <span className="text-xs text-green-600">
                      {closedPollsSubgraph.length} from subgraph
                      {closedPollsContract.length > closedPollsSubgraph.length &&
                        `, ${closedPollsContract.length - closedPollsSubgraph.length} additional from contract`}
                    </span>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchClosedPolls()}
                  disabled={closedPollsLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${closedPollsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {closedPollsLoading && closedPolls.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading closed polls...
                </div>
              ) : closedPolls.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No closed polls found.</p>
                  {isWaitingForSync && (
                    <p className="text-xs mt-2">
                      If you just closed a poll, it may take up to a minute for the subgraph to index it.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {closedPolls.map((poll) => (
                    <ClosedPollCard
                      key={poll.id}
                      poll={poll}
                      chainId={chainId}
                      onWithdrawFunds={handleWithdrawFunds}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
            </div>
          </div>
        </main>
      </div>
    </DnDContextProvider>
  )
}
