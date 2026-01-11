/**
 * Donor History Page
 * View all funding transaction history
 */

"use client"

import { useState, useMemo } from "react"
import { useAccount, useChainId } from "wagmi"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Coins,
  ExternalLink,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  CheckCircle2,
} from "lucide-react"
import { DonorBreadcrumb } from "@/components/donor/donor-breadcrumb"
import { CreatorHeaderBanner } from "@/components/creator/creator-header-banner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useUserFundings, type FormattedUserFunding } from "@/hooks/subgraph/use-user-fundings"
import { useUserDistributions, type FormattedUserDistribution } from "@/hooks/subgraph/use-user-distributions"

interface FundingTransaction {
  id: string
  pollId: string
  pollTitle: string
  type: "fund" | "refund"
  amount: string
  token: string
  status: "confirmed"
  txHash: string
  timestamp: string
}

type FilterPeriod = "all" | "week" | "month" | "year"
type FilterType = "all" | "fund" | "refund"

export default function DonorHistoryPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const router = useRouter()

  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("all")
  const [filterType, setFilterType] = useState<FilterType>("all")

  // Fetch fundings and distributions from subgraph using current network
  const { fundings, loading: fundingsLoading, totalFunded } = useUserFundings(address, chainId)
  const { distributions, loading: distributionsLoading, totalWithdrawn } = useUserDistributions(address, chainId)

  const isLoading = fundingsLoading || distributionsLoading

  // Combine fundings and distributions into transactions
  const transactions = useMemo<FundingTransaction[]>(() => {
    const fundingTxs: FundingTransaction[] = fundings.map((f) => ({
      id: f.id,
      pollId: f.pollId,
      pollTitle: f.pollTitle,
      type: "fund" as const,
      amount: f.amountFormatted.toFixed(4),
      token: f.tokenSymbol,
      status: "confirmed" as const,
      txHash: f.transactionHash,
      timestamp: f.timestamp,
    }))

    const distributionTxs: FundingTransaction[] = distributions
      .filter((d) => d.eventType === "withdrawn") // Only show withdrawals as refunds
      .map((d) => ({
        id: d.id,
        pollId: d.pollId,
        pollTitle: d.pollTitle,
        type: "refund" as const,
        amount: d.amountFormatted.toFixed(4),
        token: d.tokenSymbol,
        status: "confirmed" as const,
        txHash: d.transactionHash,
        timestamp: d.timestamp,
      }))

    // Combine and sort by timestamp descending
    return [...fundingTxs, ...distributionTxs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }, [fundings, distributions])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Filter by type
      if (filterType !== "all" && tx.type !== filterType) return false

      // Filter by period
      if (filterPeriod !== "all") {
        const txDate = new Date(tx.timestamp)
        const now = new Date()
        const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24)

        if (filterPeriod === "week" && diffDays > 7) return false
        if (filterPeriod === "month" && diffDays > 30) return false
        if (filterPeriod === "year" && diffDays > 365) return false
      }

      return true
    })
  }, [transactions, filterType, filterPeriod])

  // Calculate totals
  const totals = useMemo(() => ({
    funded: totalFunded,
    refunded: totalWithdrawn,
    transactionCount: transactions.length,
  }), [totalFunded, totalWithdrawn, transactions.length])

  // Show wallet connection warning if not connected
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <DonorBreadcrumb />
          <div className="flex items-center gap-2 rounded-lg border border-warning bg-warning/10 p-4">
            <AlertCircle className="h-5 w-5 text-warning" />
            <p className="text-sm">
              Please connect your wallet to view your funding history
            </p>
          </div>
        </div>
      </div>
    )
  }

  // All transactions from subgraph are confirmed
  const getStatusBadge = () => {
    return (
      <Badge variant="outline" className="text-green-500 border-green-500/30">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Confirmed
      </Badge>
    )
  }

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`
  }

  const getBlockExplorerUrl = (txHash: string) => {
    // Base Sepolia explorer
    if (chainId === 84532) {
      return `https://sepolia.basescan.org/tx/${txHash}`
    }
    // Base mainnet
    return `https://basescan.org/tx/${txHash}`
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <DonorBreadcrumb />

        {/* Header Banner */}
        <CreatorHeaderBanner
          title="Funding History"
          description="View all your funding transactions and activity"
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <ArrowUpRight className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Funded</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-green-500">
                      {totals.funded.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <ArrowDownRight className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Refunded</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-amber-500">
                      {totals.refunded.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{totals.transactionCount}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Transaction History
                </CardTitle>
                <CardDescription>
                  All your funding and refund transactions
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={filterPeriod} onValueChange={(v) => setFilterPeriod(v as FilterPeriod)}>
                  <SelectTrigger className="w-[130px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                  <SelectTrigger className="w-[120px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="fund">Funding</SelectItem>
                    <SelectItem value="refund">Refunds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                <p className="text-muted-foreground">
                  {filterPeriod !== "all" || filterType !== "all"
                    ? "Try adjusting your filters"
                    : "You haven't made any funding transactions yet"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Poll</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Transaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {tx.type === "fund" ? (
                              <ArrowUpRight className="h-4 w-4 text-green-500" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-amber-500" />
                            )}
                            <span className="capitalize">{tx.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            className="p-0 h-auto font-normal text-left"
                            onClick={() => router.push(`/dapp/poll/${tx.pollId}`)}
                          >
                            <span className="line-clamp-1 max-w-[200px]">{tx.pollTitle}</span>
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Coins className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {tx.amount} {tx.token}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge()}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(getBlockExplorerUrl(tx.txHash), "_blank")}
                          >
                            {truncateHash(tx.txHash)}
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
