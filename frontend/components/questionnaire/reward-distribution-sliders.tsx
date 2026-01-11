"use client"

import { useMemo, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lock, Unlock, RotateCcw } from "lucide-react"
import { formatEther, parseEther } from "viem"
import type { SelectedPoll } from "./poll-selector"

export interface RewardDistribution {
  chainId: number
  pollId: string
  percentage: number
  locked: boolean
}

interface RewardDistributionSlidersProps {
  polls: SelectedPoll[]
  totalRewardAmount: string
  distribution: RewardDistribution[]
  onChange: (distribution: RewardDistribution[]) => void
  disabled?: boolean
}

export function RewardDistributionSliders({
  polls,
  totalRewardAmount,
  distribution,
  onChange,
  disabled,
}: RewardDistributionSlidersProps) {
  // Calculate the total percentage
  const totalPercentage = useMemo(
    () => distribution.reduce((sum, d) => sum + d.percentage, 0),
    [distribution]
  )

  const isValid = Math.abs(totalPercentage - 100) < 0.01

  // Calculate actual token amounts
  const calculateTokenAmount = useCallback(
    (percentage: number) => {
      if (!totalRewardAmount || totalRewardAmount === "0") return "0"
      try {
        const total = parseEther(totalRewardAmount)
        const amount = (total * BigInt(Math.round(percentage * 100))) / BigInt(10000)
        return formatEther(amount)
      } catch {
        return "0"
      }
    },
    [totalRewardAmount]
  )

  // Handle slider change
  const handleSliderChange = (pollId: string, chainId: number, newValue: number) => {
    const currentItem = distribution.find(
      (d) => d.pollId === pollId && d.chainId === chainId
    )
    if (!currentItem) return

    const oldValue = currentItem.percentage
    const diff = newValue - oldValue

    // Get unlocked items (excluding current)
    const unlockedItems = distribution.filter(
      (d) => !d.locked && !(d.pollId === pollId && d.chainId === chainId)
    )

    if (unlockedItems.length === 0 && diff !== 0) {
      // Can't adjust if no other unlocked items
      return
    }

    // Calculate how much to take from each unlocked item
    const perItemAdjust = unlockedItems.length > 0 ? diff / unlockedItems.length : 0

    const newDistribution = distribution.map((d) => {
      if (d.pollId === pollId && d.chainId === chainId) {
        return { ...d, percentage: newValue }
      }
      if (!d.locked) {
        const adjusted = Math.max(0, Math.min(100, d.percentage - perItemAdjust))
        return { ...d, percentage: adjusted }
      }
      return d
    })

    onChange(newDistribution)
  }

  // Toggle lock status
  const toggleLock = (pollId: string, chainId: number) => {
    const newDistribution = distribution.map((d) => {
      if (d.pollId === pollId && d.chainId === chainId) {
        return { ...d, locked: !d.locked }
      }
      return d
    })
    onChange(newDistribution)
  }

  // Reset to equal distribution
  const resetToEqual = () => {
    const equalPercentage = 100 / polls.length
    const newDistribution = polls.map((poll) => ({
      chainId: poll.chainId,
      pollId: poll.pollId,
      percentage: equalPercentage,
      locked: false,
    }))
    onChange(newDistribution)
  }

  if (polls.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Add polls first to configure reward distribution
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Reward Distribution</h3>
          <p className="text-xs text-muted-foreground">
            Adjust how rewards are split between polls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isValid ? "default" : "destructive"}>
            Total: {totalPercentage.toFixed(1)}%
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToEqual}
            disabled={disabled}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Equal
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {polls.map((poll, index) => {
          const dist = distribution.find(
            (d) => d.pollId === poll.pollId && d.chainId === poll.chainId
          )
          const percentage = dist?.percentage ?? 0
          const isLocked = dist?.locked ?? false
          const tokenAmount = calculateTokenAmount(percentage)

          return (
            <Card key={`${poll.chainId}-${poll.pollId}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="font-medium text-sm truncate max-w-[200px]">
                      {poll.question}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium w-16 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleLock(poll.pollId, poll.chainId)}
                      disabled={disabled}
                    >
                      {isLocked ? (
                        <Lock className="h-4 w-4 text-primary" />
                      ) : (
                        <Unlock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Slider
                  value={[percentage]}
                  onValueChange={([value]) =>
                    handleSliderChange(poll.pollId, poll.chainId, value)
                  }
                  max={100}
                  step={0.1}
                  disabled={disabled || isLocked}
                  className={isLocked ? "opacity-50" : ""}
                />

                {totalRewardAmount && totalRewardAmount !== "0" && (
                  <div className="text-xs text-muted-foreground text-right">
                    ≈ {parseFloat(tokenAmount).toFixed(4)} tokens
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {!isValid && (
        <p className="text-sm text-destructive">
          Distribution must total exactly 100%
        </p>
      )}
    </div>
  )
}
