"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import { useUserShifts } from "@/hooks/use-sideshift"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  History,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Coins,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"

export default function ShiftsPage() {
  const { address, isConnected } = useAccount()
  const { shifts, loading, error, refresh } = useUserShifts(address)
  const [filterStatus, setFilterStatus] = useState<string>("all")

  // Filter shifts by status
  const filteredShifts = filterStatus === "all"
    ? shifts
    : shifts.filter(shift => {
        if (filterStatus === "pending") {
          return ["pending", "processing", "waiting"].includes(shift.status)
        }
        if (filterStatus === "settled") {
          return shift.status === "settled"
        }
        if (filterStatus === "failed") {
          return ["refunded", "expired", "failed"].includes(shift.status)
        }
        return true
      })

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any, label: string }> = {
      pending: { variant: "secondary", icon: Clock, label: "Pending" },
      waiting: { variant: "secondary", icon: Clock, label: "Waiting" },
      processing: { variant: "default", icon: Loader2, label: "Processing" },
      settled: { variant: "default", icon: CheckCircle2, label: "Completed" },
      refunded: { variant: "destructive", icon: XCircle, label: "Refunded" },
      expired: { variant: "destructive", icon: XCircle, label: "Expired" },
      failed: { variant: "destructive", icon: XCircle, label: "Failed" },
    }

    const config = statusMap[status] || { variant: "outline" as const, icon: AlertCircle, label: status }
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${status === "processing" ? "animate-spin" : ""}`} />
        {config.label}
      </Badge>
    )
  }

  // Purpose badge helper
  const getPurposeBadge = (purpose: string) => {
    return (
      <Badge variant="outline">
        {purpose === "fund_poll" ? "Poll Funding" : "Reward Claim"}
      </Badge>
    )
  }

  // Funding status helper
  const getFundingStatus = (shift: any) => {
    // Only applicable for fund_poll purpose and settled shifts
    if (shift.purpose !== "fund_poll" || shift.status !== "settled") {
      return null
    }

    if (shift.fundingTxHash) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Coins className="h-3 w-3" />
          Poll Funded
        </Badge>
      )
    }

    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Pending Funding
      </Badge>
    )
  }

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Shift History</h2>
          <p className="text-muted-foreground mb-4">
            Connect your wallet to view your cryptocurrency conversion history
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            Shift History
          </h1>
          <p className="text-muted-foreground">
            Track your cryptocurrency conversions via SideShift.ai
          </p>
        </div>
        <Button
          onClick={refresh}
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{shifts.length}</div>
            <p className="text-xs text-muted-foreground">Total Shifts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {shifts.filter(s => s.status === "settled").length}
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {shifts.filter(s => ["pending", "processing", "waiting"].includes(s.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {shifts.filter(s => ["refunded", "expired", "failed"].includes(s.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="settled">Completed</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Shifts List */}
      {loading && shifts.length === 0 ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading your shifts...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-destructive mb-2">Failed to load shifts</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={refresh} variant="outline">
            Try Again
          </Button>
        </div>
      ) : filteredShifts.length === 0 ? (
        <div className="text-center py-12">
          <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {filterStatus === "all"
              ? "No shifts found. Start by funding a poll or claiming rewards!"
              : `No ${filterStatus} shifts found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredShifts.map((shift) => (
            <Card key={shift.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">
                        {shift.sourceAsset.toUpperCase()} → {shift.destAsset.toUpperCase()}
                      </CardTitle>
                      {getStatusBadge(shift.status)}
                      {getPurposeBadge(shift.purpose)}
                      {getFundingStatus(shift)}
                    </div>
                    <CardDescription>
                      Created {formatDate(shift.createdAt)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Conversion Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">From</p>
                    <p className="font-mono font-semibold">
                      {shift.sourceAmount || "Variable"} {shift.sourceAsset.toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">{shift.sourceNetwork}</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">To</p>
                    <p className="font-mono font-semibold">
                      {shift.destAmount || "TBD"} {shift.destAsset.toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">{shift.destNetwork}</p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Poll ID</p>
                    <Link
                      href={`/dapp/poll/${shift.pollId}`}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      #{shift.pollId}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Shift Type</p>
                    <p className="capitalize">{shift.shiftType}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Deposit Address</p>
                    <p className="font-mono text-xs truncate" title={shift.depositAddress}>
                      {shift.depositAddress}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Settle Address</p>
                    <p className="font-mono text-xs truncate" title={shift.settleAddress}>
                      {shift.settleAddress}
                    </p>
                  </div>
                  {shift.fundingTxHash && (
                    <div>
                      <p className="text-muted-foreground mb-1">Funding Tx</p>
                      <a
                        href={`https://basescan.org/tx/${shift.fundingTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        {shift.fundingTxHash.slice(0, 10)}...
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <Link href={`/dapp/shifts/${shift.id}`}>
                      View Details
                    </Link>
                  </Button>
                  {shift.status === "settled" && shift.depositTxHash && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={`https://basescan.org/tx/${shift.depositTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View on Explorer
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
