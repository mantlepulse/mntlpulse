/**
 * Donor Stats Component
 * Displays key metrics for donor dashboard
 */

"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Coins, TrendingUp, Target, Award } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface DonorStatsProps {
  totalFunded: string
  pollsFunded: number
  activeFunding: number
  impactScore: number
  isLoading?: boolean
}

export function DonorStats({
  totalFunded,
  pollsFunded,
  activeFunding,
  impactScore,
  isLoading = false,
}: DonorStatsProps) {
  const stats = [
    {
      title: "Total Funded",
      value: totalFunded,
      icon: Coins,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Polls Funded",
      value: pollsFunded.toString(),
      icon: Target,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Active Funding",
      value: activeFunding.toString(),
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Impact Score",
      value: impactScore.toString(),
      icon: Award,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
