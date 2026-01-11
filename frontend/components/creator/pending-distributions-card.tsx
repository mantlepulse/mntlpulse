/**
 * Pending Distributions Card Component
 * Dashboard widget showing count of polls requiring distribution action
 */

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface PendingDistributionsCardProps {
  pendingCount: number
  isLoading?: boolean
}

export function PendingDistributionsCard({
  pendingCount,
  isLoading = false,
}: PendingDistributionsCardProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-5 w-5 animate-pulse rounded bg-muted" />
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-12 w-full animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasPending = pendingCount > 0

  return (
    <Card
      className={
        hasPending
          ? "border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20"
          : ""
      }
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasPending ? (
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          )}
          Pending Distributions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasPending ? (
          <>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                {pendingCount}
              </div>
              <div className="text-muted-foreground">
                {pendingCount === 1 ? "poll needs" : "polls need"} your attention
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm dark:border-orange-900 dark:bg-orange-950/50">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600 dark:text-orange-400" />
              <p className="text-orange-700 dark:text-orange-300">
                You have polls with rewards ready to distribute or funds
                available for withdrawal.
              </p>
            </div>
            <Button
              onClick={() => router.push("/creator/manage")}
              className="w-full gap-2"
              variant="default"
            >
              View Polls
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                0
              </div>
              <div className="text-muted-foreground">pending distributions</div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm dark:border-green-900 dark:bg-green-950/50">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
              <p className="text-green-700 dark:text-green-300">
                All your polls are up to date. No actions required right now.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
