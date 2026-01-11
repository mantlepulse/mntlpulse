/**
 * Poll Balance Card Component
 * Displays token balances available for distribution in a poll
 */

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Coins } from "lucide-react"
import { formatEther } from "viem"

interface TokenBalance {
  token: string
  balance: bigint
  symbol: string
}

interface PollBalanceCardProps {
  pollId: bigint
  balances: TokenBalance[]
  isLoading?: boolean
}

export function PollBalanceCard({
  pollId,
  balances,
  isLoading = false,
}: PollBalanceCardProps) {
  const formatBalance = (balance: bigint, symbol: string) => {
    if (balance === BigInt(0)) return `0 ${symbol}`
    const formatted = parseFloat(formatEther(balance)).toFixed(6)
    return `${formatted} ${symbol}`
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Coins className="h-4 w-4" />
          Available Funds
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
        ) : balances.length === 0 ? (
          <p className="text-sm text-muted-foreground">No funds available</p>
        ) : (
          <div className="space-y-2">
            {balances.map((balance) => (
              <div
                key={balance.token}
                className="flex items-center justify-between"
              >
                <Badge variant="outline" className="font-mono">
                  {balance.symbol}
                </Badge>
                <span className="text-sm font-medium">
                  {formatBalance(balance.balance, balance.symbol)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
