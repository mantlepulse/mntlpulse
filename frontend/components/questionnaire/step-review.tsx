"use client"

import { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  ListChecks,
  Coins,
  Clock,
  Tag,
  FileText,
} from "lucide-react"
import { format } from "date-fns"
import type { QuestionnaireFormData } from "./questionnaire-creation-form"
import { getTokenSymbol, TOKEN_INFO } from "@/lib/contracts/token-config"
import { useChainId } from "wagmi"

interface StepReviewProps {
  form: UseFormReturn<QuestionnaireFormData>
}

export function StepReview({ form }: StepReviewProps) {
  const values = form.watch()
  const chainId = useChainId()

  const getTokenSymbolDisplay = (token: string) => {
    if (!token) return ""
    // If it's a token symbol (like "PULSE", "ETH", "USDC"), return it directly
    const upperToken = token.toUpperCase()
    if (TOKEN_INFO[upperToken]) return upperToken
    if (TOKEN_INFO[token]) return token
    // Otherwise try to look up by address
    const symbol = getTokenSymbol(chainId, token as `0x${string}`)
    return symbol || token
  }

  const totalPercentage = (values.rewardDistribution || []).reduce(
    (sum, d) => sum + d.percentage,
    0
  )

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Review & Submit</h2>
        <p className="text-muted-foreground">
          Review your questionnaire details before creating
        </p>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Title</p>
            <p className="font-medium">{values.title || "Not set"}</p>
          </div>

          {values.description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm">{values.description}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            {values.category && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">{values.category}</Badge>
              </div>
            )}

            {values.startTime && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Starts: {format(values.startTime, "PPP")}
                </span>
              </div>
            )}

            {values.endTime && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Ends: {format(values.endTime, "PPP")}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Polls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListChecks className="h-5 w-5" />
            Polls ({values.polls?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(values.polls?.length || 0) > 0 ? (
            <div className="space-y-2">
              {values.polls?.map((poll, index) => {
                const dist = values.rewardDistribution?.find(
                  (d) => d.pollId === poll.pollId && d.chainId === poll.chainId
                )
                return (
                  <div
                    key={`${poll.chainId}-${poll.pollId}`}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{poll.question}</p>
                        <p className="text-xs text-muted-foreground">
                          Poll #{poll.pollId} • {poll.source === "new" ? "New" : "Existing"}
                        </p>
                      </div>
                    </div>
                    {dist && (
                      <Badge variant="outline">
                        {dist.percentage.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No polls added</p>
          )}
        </CardContent>
      </Card>

      {/* Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Coins className="h-5 w-5" />
            Rewards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {values.totalRewardAmount && values.totalRewardAmount !== "0" ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Reward</span>
                <span className="font-medium">
                  {values.totalRewardAmount} {getTokenSymbolDisplay(values.fundingToken || "")}
                </span>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Distribution Total</span>
                <Badge variant={Math.abs(totalPercentage - 100) < 0.01 ? "default" : "destructive"}>
                  {totalPercentage.toFixed(1)}%
                </Badge>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No rewards configured</p>
          )}
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {Object.keys(form.formState.errors).length > 0 && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <p className="text-sm text-destructive font-medium mb-2">
              Please fix the following errors:
            </p>
            <ul className="text-sm text-destructive list-disc list-inside space-y-1">
              {form.formState.errors.title && (
                <li>{form.formState.errors.title.message}</li>
              )}
              {form.formState.errors.polls && (
                <li>{form.formState.errors.polls.message}</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
