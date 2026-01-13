/**
 * Manage Polls Tab Component
 * Enhanced table for managing all creator's polls with actions
 */

"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Search, ChevronDown, ChevronRight } from "lucide-react"
import { formatEther } from "viem"
import { DistributionStatusBadge } from "./distribution-status-badge"
import { PollBalanceCard } from "./poll-balance-card"
import { DistributionModeSelector } from "./distribution-mode-selector"
import { WithdrawFundsDialog } from "./withdraw-funds-dialog"
import { BatchDistributeWizard } from "./batch-distribute-wizard"
import { DonateTreasuryDialog } from "./donate-treasury-dialog"
import { PendingDistributionBadge } from "./pending-distribution-badge"
import { usePendingDistributions } from "@/lib/hooks/use-pending-distributions"

interface TokenBalance {
  token: string
  balance: bigint
  symbol: string
}

interface Voter {
  address: string
  votedOption: number
}

interface Poll {
  id: bigint
  question: string
  isActive: boolean
  totalVotes: bigint
  totalFunding: bigint
  endTime: bigint
  distributionMode: 0 | 1 | 2
  fundingToken?: string
  fundingTokenSymbol?: string
  balances: TokenBalance[]
  voters: Voter[]
}

interface ManagePollsTabProps {
  polls: Poll[]
  isLoading?: boolean
  onSetDistributionMode: (pollId: bigint, mode: number) => Promise<void>
  onWithdrawFunds: (pollId: bigint, recipient: string, tokens: string[]) => Promise<void>
  onDistributeRewards: (
    pollId: bigint,
    token: string,
    recipients: string[],
    amounts: string[]
  ) => Promise<void>
  onClosePoll: (pollId: bigint) => Promise<void>
}

export function ManagePollsTab({
  polls,
  isLoading = false,
  onSetDistributionMode,
  onWithdrawFunds,
  onDistributeRewards,
  onClosePoll,
}: ManagePollsTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("all")
  const [expandedPoll, setExpandedPoll] = useState<bigint | null>(null)
  const [withdrawDialog, setWithdrawDialog] = useState<bigint | null>(null)
  const [distributeDialog, setDistributeDialog] = useState<bigint | null>(null)
  const [treasuryDialog, setTreasuryDialog] = useState<bigint | null>(null)

  const filteredPolls = polls.filter((poll) => {
    const matchesSearch = poll.question
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && poll.isActive) ||
      (statusFilter === "closed" && !poll.isActive)
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (isActive: boolean, endTime: bigint) => {
    const now = BigInt(Math.floor(Date.now() / 1000))
    if (!isActive) {
      return <Badge variant="secondary">Closed</Badge>
    }
    if (endTime < now) {
      return <Badge variant="outline">Ended</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  const formatReward = (amount: bigint, symbol?: string) => {
    const tokenSymbol = symbol || "PULSE"
    if (amount === BigInt(0)) return `0 ${tokenSymbol}`
    const formatted = parseFloat(formatEther(amount)).toFixed(4)
    return `${formatted} ${tokenSymbol}`
  }

  const hasPendingDistribution = (poll: Poll) => {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const hasEnded = poll.endTime < now
    const hasFunds = poll.totalFunding > BigInt(0)
    const isClosed = !poll.isActive
    const isManualMode = poll.distributionMode === 0 || poll.distributionMode === 1

    return hasEnded && isClosed && hasFunds && isManualMode
  }

  const toggleExpanded = (pollId: bigint) => {
    setExpandedPoll((prev) => (prev === pollId ? null : pollId))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Manage Polls</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search polls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-full sm:w-[200px]"
                />
              </div>
              <div className="flex gap-1">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === "closed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("closed")}
                >
                  Closed
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : filteredPolls.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "No polls match your filters"
                : "No polls created yet"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPolls.map((poll) => (
                <Collapsible key={poll.id.toString()} open={expandedPoll === poll.id}>
                  <div className="rounded-lg border">
                    <CollapsibleTrigger asChild>
                      <button
                        className="flex w-full items-center justify-between p-4 hover:bg-accent transition-colors"
                        onClick={() => toggleExpanded(poll.id)}
                      >
                        <div className="flex items-center gap-4 flex-1 text-left">
                          {expandedPoll === poll.id ? (
                            <ChevronDown className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/dapp/poll/${poll.id}`}
                              className="font-medium hover:underline block truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {poll.question}
                            </Link>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="hidden md:flex md:items-center md:gap-2">
                            {getStatusBadge(poll.isActive, poll.endTime)}
                            <PendingDistributionBadge
                              hasPending={hasPendingDistribution(poll)}
                              mode={poll.distributionMode}
                              variant="compact"
                            />
                          </div>
                          <div className="hidden sm:block text-right">
                            <div className="text-sm text-muted-foreground">
                              {poll.totalVotes.toString()} responses
                            </div>
                          </div>
                          <div className="text-right min-w-[80px]">
                            <div className="text-sm font-medium">
                              {formatReward(poll.totalFunding, poll.fundingTokenSymbol)}
                            </div>
                          </div>
                        </div>
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t p-4 space-y-4 bg-muted/30">
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Poll Balance */}
                          <PollBalanceCard
                            pollId={poll.id}
                            balances={poll.balances}
                          />

                          {/* Distribution Mode */}
                          <DistributionModeSelector
                            pollId={poll.id}
                            currentMode={poll.distributionMode.toString() as "0" | "1" | "2"}
                            onModeChange={onSetDistributionMode}
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setWithdrawDialog(poll.id)}
                            disabled={poll.balances.length === 0}
                          >
                            Withdraw Funds
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDistributeDialog(poll.id)}
                            disabled={poll.balances.length === 0 || poll.voters.length === 0}
                          >
                            Distribute Rewards
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTreasuryDialog(poll.id)}
                            disabled={poll.balances.length === 0}
                          >
                            Donate to Treasury
                          </Button>
                          {poll.isActive && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onClosePoll(poll.id)}
                            >
                              Close Poll
                            </Button>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {withdrawDialog && (
        <WithdrawFundsDialog
          open={!!withdrawDialog}
          onOpenChange={(open) => !open && setWithdrawDialog(null)}
          pollId={withdrawDialog}
          pollTitle={polls.find((p) => p.id === withdrawDialog)?.question || ""}
          balances={polls.find((p) => p.id === withdrawDialog)?.balances || []}
          onWithdraw={onWithdrawFunds}
        />
      )}

      {distributeDialog && (
        <BatchDistributeWizard
          open={!!distributeDialog}
          onOpenChange={(open) => !open && setDistributeDialog(null)}
          pollId={distributeDialog}
          pollTitle={polls.find((p) => p.id === distributeDialog)?.question || ""}
          onDistribute={onDistributeRewards}
        />
      )}

      {treasuryDialog && (
        <DonateTreasuryDialog
          open={!!treasuryDialog}
          onOpenChange={(open) => !open && setTreasuryDialog(null)}
          pollId={treasuryDialog}
          pollTitle={polls.find((p) => p.id === treasuryDialog)?.question || ""}
          balances={polls.find((p) => p.id === treasuryDialog)?.balances || []}
        />
      )}
    </div>
  )
}
