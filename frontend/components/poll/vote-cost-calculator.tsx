"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Calculator, TrendingUp, Coins } from "lucide-react"
import { formatEther } from "viem"
import { calculateQuadraticCostLocal } from "@/lib/contracts/polls-contract-utils"

interface VoteCostCalculatorProps {
  currentVotes?: number
  showComparisonTable?: boolean
}

export function VoteCostCalculator({
  currentVotes = 0,
  showComparisonTable = true
}: VoteCostCalculatorProps) {
  const [additionalVotes, setAdditionalVotes] = useState(1)

  // Calculate total cost
  const totalCost = useMemo(() => {
    return calculateQuadraticCostLocal(currentVotes, additionalVotes)
  }, [currentVotes, additionalVotes])

  // Calculate average cost per vote
  const avgCostPerVote = useMemo(() => {
    if (additionalVotes === 0) return BigInt(0)
    return totalCost / BigInt(additionalVotes)
  }, [totalCost, additionalVotes])

  // Generate comparison table data
  const comparisonData = useMemo(() => {
    const data = []
    const voteAmounts = [1, 2, 3, 5, 10, 20, 50]

    for (const votes of voteAmounts) {
      const cost = calculateQuadraticCostLocal(currentVotes, votes)
      const avgCost = cost / BigInt(votes)
      data.push({
        votes,
        totalCost: cost,
        avgCost,
        marginalCost: BigInt((currentVotes + votes) ** 2) * BigInt(1e18),
      })
    }

    return data
  }, [currentVotes])

  // Calculate individual vote costs for breakdown
  const voteBreakdown = useMemo(() => {
    const breakdown = []
    const maxDisplay = Math.min(additionalVotes, 10)

    for (let i = 1; i <= maxDisplay; i++) {
      const voteNum = currentVotes + i
      breakdown.push({
        voteNumber: voteNum,
        cost: BigInt(voteNum ** 2) * BigInt(1e18),
      })
    }

    return breakdown
  }, [currentVotes, additionalVotes])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Vote Cost Calculator
        </CardTitle>
        <CardDescription>
          Preview the cost of purchasing votes in quadratic voting polls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Votes Input */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currentVotes">Your Current Votes</Label>
            <div className="text-2xl font-bold">{currentVotes}</div>
            <p className="text-xs text-muted-foreground">
              Starting point for cost calculation
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="additionalVotes">Votes to Purchase</Label>
            <div className="flex items-center gap-2">
              <Input
                id="additionalVotes"
                type="number"
                min={1}
                max={100}
                value={additionalVotes}
                onChange={(e) => setAdditionalVotes(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-24"
              />
            </div>
          </div>
        </div>

        <Slider
          value={[additionalVotes]}
          onValueChange={([value]) => setAdditionalVotes(value)}
          min={1}
          max={50}
          step={1}
          className="w-full"
        />

        {/* Cost Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Cost</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {Number(formatEther(totalCost)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">PULSE</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg per Vote</span>
            </div>
            <div className="text-2xl font-bold">
              {Number(formatEther(avgCostPerVote)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">PULSE / vote</div>
          </div>
        </div>

        {/* Vote Breakdown */}
        {voteBreakdown.length > 0 && (
          <div className="space-y-3">
            <Label>Cost Breakdown (per vote)</Label>
            <div className="flex flex-wrap gap-2">
              {voteBreakdown.map((item) => (
                <Badge key={item.voteNumber} variant="outline" className="text-xs">
                  Vote #{item.voteNumber}: {Number(formatEther(item.cost)).toLocaleString()} PULSE
                </Badge>
              ))}
              {additionalVotes > 10 && (
                <Badge variant="secondary" className="text-xs">
                  +{additionalVotes - 10} more votes...
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Comparison Table */}
        {showComparisonTable && (
          <div className="space-y-3">
            <Label>Quick Reference</Label>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Votes</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Avg/Vote</TableHead>
                    <TableHead className="text-right">Last Vote Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.map((row) => (
                    <TableRow key={row.votes}>
                      <TableCell className="font-medium">{row.votes}</TableCell>
                      <TableCell>
                        {Number(formatEther(row.totalCost)).toLocaleString(undefined, { maximumFractionDigits: 0 })} PULSE
                      </TableCell>
                      <TableCell>
                        {Number(formatEther(row.avgCost)).toLocaleString(undefined, { maximumFractionDigits: 0 })} PULSE
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(formatEther(row.marginalCost)).toLocaleString(undefined, { maximumFractionDigits: 0 })} PULSE
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Formula Explanation */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Formula:</strong> Cost for nth vote = n² PULSE
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Total cost = sum of squares from (current + 1) to (current + additional)
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
