"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink, ArrowRight, Check } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export interface ShiftStatusData {
  shiftId: string
  orderId: string
  status: "pending" | "waiting" | "processing" | "settled" | "expired" | "failed"
  depositAddress: string
  depositCoin: string
  depositNetwork?: string
  depositAmount?: string
  settleCoin: string
  settleNetwork?: string
  settleAmount?: string
  expiresAt?: string
}

interface ShiftStatusCardProps {
  data: ShiftStatusData
  onRefresh?: () => void
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  waiting: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  processing: "bg-purple-500/20 text-purple-500 border-purple-500/30",
  settled: "bg-green-500/20 text-green-500 border-green-500/30",
  expired: "bg-gray-500/20 text-gray-500 border-gray-500/30",
  failed: "bg-red-500/20 text-red-500 border-red-500/30",
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  waiting: "Awaiting Deposit",
  processing: "Processing",
  settled: "Complete",
  expired: "Expired",
  failed: "Failed",
}

export function ShiftStatusCard({ data, onRefresh }: ShiftStatusCardProps) {
  const [copied, setCopied] = useState(false)

  const copyAddress = async () => {
    await navigator.clipboard.writeText(data.depositAddress)
    setCopied(true)
    toast.success("Address copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border-secondary/30 bg-gradient-to-br from-secondary/5 to-secondary/10">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">SideShift Order</CardTitle>
          <Badge variant="outline" className={statusColors[data.status]}>
            {statusLabels[data.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conversion */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="text-center">
            <p className="text-lg font-semibold">
              {data.depositAmount || "?"} {data.depositCoin}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.depositNetwork || "Any network"}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <div className="text-center">
            <p className="text-lg font-semibold">
              {data.settleAmount || "~"} {data.settleCoin}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.settleNetwork || ""}
            </p>
          </div>
        </div>

        {/* Deposit Address */}
        {data.status === "waiting" && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Send {data.depositCoin} to:
            </p>
            <div className="flex items-center gap-2 p-2 rounded-md bg-background/50">
              <code className="flex-1 text-xs break-all font-mono">
                {data.depositAddress}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={copyAddress}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Expiration */}
        {data.expiresAt && data.status === "waiting" && (
          <p className="text-xs text-muted-foreground text-center">
            Expires: {new Date(data.expiresAt).toLocaleString()}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() =>
              window.open(
                `https://sideshift.ai/orders/${data.orderId}`,
                "_blank"
              )
            }
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View on SideShift
          </Button>
          {onRefresh && data.status !== "settled" && data.status !== "expired" && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
