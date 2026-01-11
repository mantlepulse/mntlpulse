/**
 * Claim History Component
 * Displays table of past reward claims
 */

"use client"

import { useState } from "react"
import Link from "next/link"
import { ExternalLink, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import { ChevronDown } from "lucide-react"

interface ClaimHistoryItem {
  id: string
  pollId: bigint
  pollQuestion: string
  amount: string
  convertedTo: string
  status: "completed" | "processing" | "failed"
  timestamp: Date
  txHash?: string
}

interface ClaimHistoryProps {
  claims: ClaimHistoryItem[]
  isLoading?: boolean
}

export function ClaimHistory({ claims, isLoading = false }: ClaimHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleExportCSV = () => {
    const headers = ["Date", "Poll", "Amount", "Converted To", "Status", "Transaction"]
    const rows = claims.map((claim) => [
      claim.timestamp.toLocaleDateString(),
      claim.pollQuestion,
      claim.amount,
      claim.convertedTo,
      claim.status,
      claim.txHash || "N/A",
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `claim-history-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-48 bg-muted animate-pulse rounded-md" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  if (claims.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No claim history yet
      </div>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-4">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 p-0 hover:bg-transparent">
            <h3 className="text-lg font-semibold">Claim History</h3>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </Button>
        </CollapsibleTrigger>
        {isOpen && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      <CollapsibleContent className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Poll</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Converted To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Transaction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="font-medium">
                    {claim.timestamp.toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dapp/poll/${claim.pollId}`}
                      className="hover:underline max-w-xs truncate block"
                    >
                      {claim.pollQuestion}
                    </Link>
                  </TableCell>
                  <TableCell>{claim.amount} PULSE</TableCell>
                  <TableCell>{claim.convertedTo}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        claim.status === "completed"
                          ? "default"
                          : claim.status === "processing"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {claim.txHash ? (
                      <a
                        href={`https://mantlescan.xyz/tx/${claim.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
