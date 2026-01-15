/**
 * Claimable Rewards List Component
 * Displays list of claimable rewards with search and filter
 */

"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RewardCard } from "@/components/participant/reward-card"

interface ClaimableReward {
  id: bigint
  question: string
  isActive: boolean
  endTime: bigint
  totalFunding: bigint
  claimableAmount: string
  totalParticipants: number
  tokenSymbol?: string
  tokenDecimals?: number
  hasClaimed?: boolean
  status?: string
}

interface ClaimableRewardsListProps {
  rewards: ClaimableReward[]
  isLoading?: boolean
  onClaimSuccess?: () => void
}

export function ClaimableRewardsList({ rewards, isLoading = false, onClaimSuccess }: ClaimableRewardsListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"amount" | "expiration" | "recent">("amount")

  // Filter and sort rewards
  const filteredAndSortedRewards = useMemo(() => {
    let filtered = rewards

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((reward) =>
        reward.question.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "amount") {
        return parseFloat(b.claimableAmount) - parseFloat(a.claimableAmount)
      } else if (sortBy === "expiration") {
        return Number(a.endTime) - Number(b.endTime)
      } else { // recent
        return Number(b.id) - Number(a.id)
      }
    })

    return sorted
  }, [rewards, searchQuery, sortBy])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="h-10 w-full sm:w-80 bg-muted animate-pulse rounded-md" />
          <div className="h-10 w-full sm:w-48 bg-muted animate-pulse rounded-md" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-96 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search polls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="amount">Amount (High to Low)</SelectItem>
            <SelectItem value="expiration">Expiration Date</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rewards Grid */}
      {filteredAndSortedRewards.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery
              ? "No rewards match your search"
              : "No claimable rewards at the moment"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredAndSortedRewards.map((reward) => (
            <RewardCard key={Number(reward.id)} poll={reward} onClaimSuccess={onClaimSuccess} />
          ))}
        </div>
      )}
    </div>
  )
}
