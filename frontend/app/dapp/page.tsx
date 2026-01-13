"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PollCard } from "@/components/poll-card"
import { PollFilters } from "@/components/poll-filters"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { Plus, TrendingUp, Clock, Users, AlertCircle, Loader2, ListChecks } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useVote, usePollsContractAddress, useNextPollId } from "@/lib/contracts/polls-contract-utils"
import { toast } from "sonner"
import { useAccount, useChainId, useSwitchChain } from "wagmi"
import { mantleSepoliaTestnet } from "wagmi/chains"
import { usePollsData } from "@/hooks/use-polls-data"
import { useDataSource } from "@/contexts/data-source-context"
import { formatRewardDisplay } from "@/lib/utils/format-reward"

export default function DappPage() {
  const router = useRouter()
  const [filters, setFilters] = useState({
    search: "",
    status: "All Status",
    category: "All Categories",
    fundingType: "All Funding",
    sortBy: "newest",
  })
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only showing connected state after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const contractAddress = usePollsContractAddress()
  const { switchChain } = useSwitchChain()
  const { vote, isPending: isVoting, isConfirming: isVoteConfirming, isSuccess: isVoteSuccess } = useVote()
  const [votedPollId, setVotedPollId] = useState<string | null>(null)
  const { data: nextPollId } = useNextPollId()
  const { dataSource } = useDataSource()

  // Use unified polls data hook with pagination
  const {
    polls,
    loading: isLoading,
    loadingMore,
    error: pollsError,
    hasMore,
    loadMore,
    refetchPoll,
    totalCount,
    source: dataSourceUsed,
  } = usePollsData({ pageSize: 6 })

  // Network info for users
  const networkName = chainId === 5000 ? "Mantle Mainnet" : chainId === 5003 ? "Mantle Sepolia" : "Unknown Network"
  const hasContractOnNetwork = contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000"

  // Handle successful vote confirmation
  useEffect(() => {
    if (isVoteSuccess && votedPollId) {
      toast.success("Vote submitted successfully!")
      // Refetch the poll data to update vote counts
      refetchPoll(parseInt(votedPollId))
      // Reset voted poll ID
      setVotedPollId(null)
    }
  }, [isVoteSuccess, votedPollId, refetchPoll])

  const handleVote = async (pollId: string, optionId: string) => {
    if (!isConnected) {
      throw new Error("Please connect your wallet to vote")
    }

    // Extract option index from optionId (format: "pollId-optionIndex")
    const optionIndex = parseInt(optionId.split('-')[1])

    if (isNaN(optionIndex) || isNaN(parseInt(pollId))) {
      throw new Error("Invalid poll ID or option index")
    }

    try {
      // Store the poll ID to track which poll was voted on
      setVotedPollId(pollId)
      await vote(parseInt(pollId), optionIndex)
    } catch (error) {
      console.error("Vote failed:", error)
      // Clear voted poll ID on error
      setVotedPollId(null)

      // Transform error messages to user-friendly versions
      if (error instanceof Error) {
        if (error.message.includes("User rejected") || error.message.includes("rejected")) {
          throw new Error("Transaction was rejected")
        } else if (error.message.includes("insufficient funds")) {
          throw new Error("Insufficient funds for transaction")
        } else if (error.message.includes("already voted")) {
          throw new Error("You have already voted on this poll")
        } else {
          throw error
        }
      } else {
        throw new Error("Vote failed. Please try again.")
      }
    }
  }

  // Filter polls
  const filteredPolls = polls
    .filter((poll) => {
      if (
        filters.search &&
        !poll.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !poll.description?.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false
      }
      if (filters.status !== "All Status" && poll.status !== filters.status.toLowerCase()) {
        return false
      }
      if (filters.category !== "All Categories" && poll.category !== filters.category) {
        return false
      }
      if (filters.fundingType !== "All Funding") {
        const fundingMap = {
          "Self-funded": "self",
          Community: "community",
          "No rewards": "none",
        }
        if (poll.fundingType !== fundingMap[filters.fundingType as keyof typeof fundingMap]) {
          return false
        }
      }
      return true
    })
    // Sort polls
    .sort((a, b) => {
      switch (filters.sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "most-votes":
          return b.totalVotes - a.totalVotes
        case "highest-reward":
          return b.totalReward - a.totalReward
        case "ending-soon":
          // Active polls first, then sort by end time (soonest first)
          if (a.status === "active" && b.status !== "active") return -1
          if (a.status !== "active" && b.status === "active") return 1
          return new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime()
        default:
          return 0
      }
    })

  const totalPolls = Number(nextPollId || 0n)
  const activePolls = totalCount

  // Calculate total rewards grouped by token
  const rewardsByToken = polls.reduce((acc, poll) => {
    const token = poll.fundingToken?.toUpperCase() || 'PULSE'
    acc[token] = (acc[token] || 0) + poll.totalReward
    return acc
  }, {} as Record<string, number>)

  // Format total rewards display string
  const formatTotalRewardsDisplay = () => {
    const parts: string[] = []
    if (rewardsByToken['PULSE'] && rewardsByToken['PULSE'] > 0) {
      parts.push(formatRewardDisplay(rewardsByToken['PULSE'], 'PULSE'))
    }
    if (rewardsByToken['USDC'] && rewardsByToken['USDC'] > 0) {
      parts.push(formatRewardDisplay(rewardsByToken['USDC'], 'USDC'))
    }
    if (rewardsByToken['MNT'] && rewardsByToken['MNT'] > 0) {
      parts.push(formatRewardDisplay(rewardsByToken['MNT'], 'MNT'))
    }
    // If no rewards, show 0 PULSE
    if (parts.length === 0) return '0.0 PULSE'
    return parts.join(' + ')
  }

  const stats = {
    totalPolls,
    activePolls,
    totalVotes: polls.reduce((sum, poll) => sum + poll.totalVotes, 0),
    totalRewardsDisplay: formatTotalRewardsDisplay(),
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Show Connect Wallet CTA when not connected */}
      {!mounted || !isConnected ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="text-center space-y-4 max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              Welcome to SideShift Pulse
            </h1>
            <p className="text-xl text-muted-foreground">
              Connect your wallet to explore and vote on community-driven polls
            </p>
            <p className="text-sm text-muted-foreground">
              Create polls, participate in decisions, and earn rewards for your participation
            </p>
          </div>
          <ConnectWalletButton />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Explore Polls</h1>
              <p className="text-muted-foreground">
                Discover and participate in community-driven decisions
              </p>
              {!hasContractOnNetwork && isConnected && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-amber-600 mt-2 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">
                      Contract not deployed on {networkName}. Please switch to Mantle Sepolia.
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-600 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    onClick={() => switchChain({ chainId: mantleSepoliaTestnet.id })}
                  >
                    Switch to Mantle Sepolia
                  </Button>
                </div>
              )}
              {pollsError && (
                <div className="flex items-center gap-2 text-red-600 mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Error loading polls: {pollsError.message}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button asChild size="lg">
                <Link href="/dapp/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Poll
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/dapp/questionnaires/create">
                  <ListChecks className="h-4 w-4 mr-2" />
                  Create Questionnaire
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/dapp/questionnaires">
                  <ListChecks className="h-4 w-4 mr-2" />
                  Browse Questionnaires
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{stats.totalPolls}</span>
              </div>
              <p className="text-sm text-muted-foreground">Total Polls</p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">{stats.activePolls}</span>
              </div>
              <p className="text-sm text-muted-foreground">Active Polls</p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-2xl font-bold">{stats.totalVotes.toLocaleString()}</span>
              </div>
              <p className="text-sm text-muted-foreground">Total Votes</p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{stats.totalRewardsDisplay}</span>
              </div>
              <p className="text-sm text-muted-foreground">Total Rewards</p>
            </div>
          </div>

          {/* Filters */}
          <PollFilters filters={filters} onFiltersChange={setFilters} />

          {/* Polls Grid */}
          {isLoading && polls.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-card p-6 rounded-lg border animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPolls.map((poll) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    onVote={handleVote}
                    onViewDetails={(pollId) => {
                      router.push(`/dapp/poll/${pollId}`)
                    }}
                    onFundSuccess={refetchPoll}
                    onVoteSuccess={refetchPoll}
                    isVoting={isVoting}
                    isVoteConfirming={isVoteConfirming}
                    isVoteSuccess={isVoteSuccess}
                    votingPollId={votedPollId}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && filteredPolls.length > 0 && (
                <div className="flex justify-center mt-8">
                  <Button
                    onClick={loadMore}
                    disabled={loadingMore}
                    variant="outline"
                    size="lg"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More Polls'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}

          {!isLoading && filteredPolls.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-lg mb-2">
                {!hasContractOnNetwork
                  ? `Contract not available on ${networkName}`
                  : polls.length === 0
                  ? "No active polls found."
                  : "No polls found matching your criteria."
                }
              </p>
              {hasContractOnNetwork && (
                <Button asChild className="mt-4">
                  <Link href="/dapp/create">
                    {polls.length === 0 ? "Create the first poll" : "Create a poll"}
                  </Link>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
