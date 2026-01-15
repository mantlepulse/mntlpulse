"use client"

import { Card } from "@/components/ui/card"
import { ScrollReveal } from "@/components/scroll-reveal"
import { Skeleton } from "@/components/ui/skeleton"
import { useGlobalStats } from "@/hooks/use-global-stats"
import { formatEther } from "viem"

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  }
  return num.toString()
}

function formatTokenAmount(weiAmount: number): string {
  const tokenValue = Number(formatEther(BigInt(weiAmount)))
  if (tokenValue >= 1000) {
    return `${(tokenValue / 1000).toFixed(1)}K PULSE`
  }
  if (tokenValue >= 1) {
    return `${tokenValue.toFixed(2)} PULSE`
  }
  if (tokenValue > 0) {
    return `${tokenValue.toFixed(4)} PULSE`
  }
  return "0 PULSE"
}

function StatCardSkeleton() {
  return (
    <Card className="p-6 text-center">
      <div className="space-y-2">
        <Skeleton className="h-9 w-20 mx-auto" />
        <Skeleton className="h-5 w-24 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </Card>
  )
}

export function StatsSection() {
  const { stats, loading } = useGlobalStats()

  const displayStats = [
    {
      value: stats ? formatNumber(stats.totalPolls) : "0",
      label: "Polls Created",
      description: "Community decisions on-chain",
    },
    {
      value: stats ? formatNumber(stats.totalVotes) : "0",
      label: "Votes Cast",
      description: "Transparent participation",
    },
    {
      value: stats ? formatTokenAmount(stats.totalDistributions) : "0 PULSE",
      label: "Rewards Distributed",
      description: "Distributed to participants",
    },
    {
      value: stats ? formatNumber(stats.totalUsers) : "0",
      label: "Unique Users",
      description: "Active community members",
    },
  ]

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <ScrollReveal>
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Trusted by communities worldwide
            </h2>
            <p className="mx-auto max-w-[700px] text-muted-foreground text-lg">
              Join thousands of communities making decisions transparently on Mantle
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {loading && !stats ? (
            <>
              {[0, 1, 2, 3].map((index) => (
                <ScrollReveal key={index} delay={index * 100}>
                  <StatCardSkeleton />
                </ScrollReveal>
              ))}
            </>
          ) : (
            displayStats.map((stat, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <Card className="p-6 text-center">
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-primary">{stat.value}</div>
                    <div className="font-semibold">{stat.label}</div>
                    <div className="text-sm text-muted-foreground">{stat.description}</div>
                  </div>
                </Card>
              </ScrollReveal>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
