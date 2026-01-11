/**
 * Distributions Tab Component
 * Timeline view of all distribution events for creator's polls
 */

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Search, Download, ExternalLink, Filter } from "lucide-react"
import { formatEther } from "viem"

interface Distribution {
  id: number
  pollId: bigint
  pollTitle: string
  recipient: string
  amount: string
  token: string
  txHash: string
  eventType: "distributed" | "claimed" | "withdrawn"
  timestamp: Date
}

interface DistributionsTabProps {
  distributions: Distribution[]
  isLoading?: boolean
}

export function DistributionsTab({
  distributions,
  isLoading = false,
}: DistributionsTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [eventFilter, setEventFilter] = useState<string>("all")
  const [pollFilter, setPollFilter] = useState<string>("all")

  const uniquePolls = Array.from(
    new Set(distributions.map((d) => d.pollId.toString()))
  ).map((id) => {
    const dist = distributions.find((d) => d.pollId.toString() === id)
    return {
      id,
      title: dist?.pollTitle || "",
    }
  })

  const filteredDistributions = distributions.filter((dist) => {
    const matchesSearch =
      dist.pollTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dist.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dist.txHash.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesEvent =
      eventFilter === "all" || dist.eventType === eventFilter

    const matchesPoll =
      pollFilter === "all" || dist.pollId.toString() === pollFilter

    return matchesSearch && matchesEvent && matchesPoll
  })

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case "distributed":
        return (
          <Badge variant="default" className="bg-green-500">
            Distributed
          </Badge>
        )
      case "claimed":
        return <Badge variant="secondary">Claimed</Badge>
      case "withdrawn":
        return <Badge variant="outline">Withdrawn</Badge>
      default:
        return <Badge>{eventType}</Badge>
    }
  }

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Poll",
      "Event Type",
      "Recipient",
      "Amount",
      "Token",
      "Transaction Hash",
    ]

    const rows = filteredDistributions.map((dist) => [
      new Date(dist.timestamp).toLocaleString(),
      dist.pollTitle,
      dist.eventType,
      dist.recipient,
      formatEther(BigInt(dist.amount)),
      dist.token,
      dist.txHash,
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `distributions-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Distribution History</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={filteredDistributions.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search distributions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="distributed">Distributed</SelectItem>
                <SelectItem value="claimed">Claimed</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pollFilter} onValueChange={setPollFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by poll" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Polls</SelectItem>
                {uniquePolls.map((poll) => (
                  <SelectItem key={poll.id} value={poll.id}>
                    {poll.title.slice(0, 30)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {filteredDistributions.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total Distributions
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {
                    new Set(filteredDistributions.map((d) => d.recipient))
                      .size
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Unique Recipients
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {filteredDistributions
                    .reduce(
                      (sum, d) => sum + Number(formatEther(BigInt(d.amount))),
                      0
                    )
                    .toFixed(4)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total Distributed (ETH)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : filteredDistributions.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              {searchQuery || eventFilter !== "all" || pollFilter !== "all" ? (
                <p>No distributions match your filters</p>
              ) : (
                <>
                  <p>No distribution events yet</p>
                  <p className="text-xs">
                    Distribute rewards from the Manage Polls page
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Poll</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>TX</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDistributions.map((dist) => (
                    <TableRow key={dist.id}>
                      <TableCell className="text-sm">
                        {new Date(dist.timestamp).toLocaleDateString()}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {new Date(dist.timestamp).toLocaleTimeString()}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {dist.pollTitle}
                      </TableCell>
                      <TableCell>{getEventBadge(dist.eventType)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {dist.recipient.slice(0, 6)}...
                        {dist.recipient.slice(-4)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatEther(BigInt(dist.amount))} {dist.token}
                      </TableCell>
                      <TableCell>
                        <a
                          href={`https://basescan.org/tx/${dist.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </a>
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
  )
}
