"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Heart, Wallet, RefreshCw, ExternalLink, Trophy, Gift, TrendingUp } from "lucide-react"
import { useAccount } from "wagmi"
import { usePlatformTreasury } from "@/lib/contracts/polls-contract-utils"
import { useTreasuryDonations } from "@/hooks/use-treasury-donations"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import Link from "next/link"

export default function DonorsPage() {
  const { isConnected } = useAccount()
  const { data: treasuryAddress, isLoading: isTreasuryLoading } = usePlatformTreasury()
  const { donations, loading: isDonationsLoading, error, refetch, totalDonationsByToken } = useTreasuryDonations()

  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Get unique donors count (by poll creators - not tracked in events, so estimate by unique polls)
  const uniquePollsDonated = new Set(donations.map(d => d.pollId)).size

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="text-center space-y-4 max-w-2xl">
            <Heart className="h-16 w-16 mx-auto text-pink-500" />
            <h1 className="text-4xl font-bold">Community Treasury Donors</h1>
            <p className="text-xl text-muted-foreground">
              Connect your wallet to view donations to the community treasury
            </p>
          </div>
          <ConnectWalletButton />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Heart className="h-8 w-8 text-pink-500" />
            <h1 className="text-3xl font-bold">Community Treasury</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Thank you to all donors who support the platform
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing || isDonationsLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Treasury Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Treasury Address
          </CardTitle>
          <CardDescription>
            All donations are sent to this address
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isTreasuryLoading ? (
            <Skeleton className="h-6 w-96" />
          ) : treasuryAddress ? (
            <div className="flex items-center gap-2">
              <code className="text-sm bg-muted px-3 py-2 rounded-lg font-mono">
                {treasuryAddress as string}
              </code>
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <a
                  href={`https://sepolia.mantlescan.xyz/address/${treasuryAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">Treasury address not set</p>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center">
                <Gift className="h-6 w-6 text-pink-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Donations</p>
                <p className="text-2xl font-bold">{donations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <div className="text-lg font-bold">
                  {Object.entries(totalDonationsByToken).length > 0 ? (
                    Object.entries(totalDonationsByToken).map(([symbol, amount]) => (
                      <div key={symbol} className="text-sm">
                        {amount.toFixed(4)} {symbol}
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Polls Donated From</p>
                <p className="text-2xl font-bold">{uniquePollsDonated}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Donations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Donation History
          </CardTitle>
          <CardDescription>
            All donations to the community treasury
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isDonationsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">Error loading donations: {error.message}</p>
              <Button variant="outline" onClick={handleRefresh} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : donations.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-lg mb-2">No donations yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Poll creators can donate excess funds to the treasury after polls end
              </p>
              <Button asChild variant="outline">
                <Link href="/creator/manage">
                  Manage Your Polls
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Poll ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donations.map((donation, index) => (
                  <TableRow key={`${donation.transactionHash}-${index}`}>
                    <TableCell>
                      <Link
                        href={`/dapp/poll/${donation.pollId}`}
                        className="text-primary hover:underline"
                      >
                        #{donation.pollId}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      {parseFloat(donation.formattedAmount).toFixed(4)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{donation.tokenSymbol}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {donation.timestamp
                        ? donation.timestamp.toLocaleDateString()
                        : `Block ${donation.blockNumber.toString()}`}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`https://sepolia.mantlescan.xyz/tx/${donation.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {formatAddress(donation.transactionHash)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 border-pink-200 dark:border-pink-900">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Heart className="h-10 w-10 text-pink-500" />
              <div>
                <h3 className="font-semibold text-lg">Want to contribute?</h3>
                <p className="text-muted-foreground">
                  Create a poll and donate excess funds to support the community
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/dapp/create">
                Create a Poll
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
