/**
 * Participant Stats Component
 * Displays statistics for participant rewards
 */

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Coins, BarChart3, CheckCircle, Clock } from "lucide-react"

interface ParticipantStatsProps {
  totalClaimable: string
  pollsParticipated: number
  totalClaimed: string
  pendingClaims: number
  isLoading?: boolean
}

export function ParticipantStats({
  totalClaimable,
  pollsParticipated,
  totalClaimed,
  pendingClaims,
  isLoading = false,
}: ParticipantStatsProps) {
  const stats = [
    {
      title: "Total Claimable",
      value: totalClaimable,
      icon: Coins,
      description: "Available to claim now",
    },
    {
      title: "Polls Participated",
      value: pollsParticipated.toString(),
      icon: BarChart3,
      description: "Total polls voted in",
    },
    {
      title: "Total Claimed",
      value: totalClaimed,
      icon: CheckCircle,
      description: "All-time claimed rewards",
    },
    {
      title: "Pending Claims",
      value: pendingClaims.toString(),
      icon: Clock,
      description: "Polls with unclaimed rewards",
    },
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-full" />
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
