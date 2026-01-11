"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, ListChecks, Users, Coins, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { getNetworkName, getNetworkColor } from "@/lib/utils/network"
import { formatRewardDisplay } from "@/lib/utils/format-reward"
import Link from "next/link"
import type { Questionnaire, QuestionnaireProgress } from "@/hooks/use-questionnaires"

interface QuestionnaireCardProps {
  questionnaire: Questionnaire
  progress?: QuestionnaireProgress
  showCreatorActions?: boolean
  onEdit?: (id: string) => void
  onArchive?: (id: string) => void
  onToggleStatus?: (id: string, newStatus: 'active' | 'draft') => void
  isTogglingStatus?: boolean
}

export function QuestionnaireCard({
  questionnaire,
  progress,
  showCreatorActions = false,
  onEdit,
  onArchive,
  onToggleStatus,
  isTogglingStatus = false,
}: QuestionnaireCardProps) {
  const timeRemaining = questionnaire.endTime
    ? new Date(questionnaire.endTime).getTime() - new Date().getTime()
    : null
  const daysRemaining = timeRemaining
    ? Math.max(0, Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)))
    : null

  const statusColors: Record<string, string> = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    draft: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    closed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  }

  const progressPercentage = progress?.started
    ? Math.round((progress.pollsAnswered.length / questionnaire.pollCount) * 100)
    : 0

  const isCompleted = progress?.isComplete ?? false

  return (
    <Card className="h-full hover:shadow-lg transition-all duration-200 gradient-card border-border/50">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                {questionnaire.title}
              </h3>
              <Badge
                variant="outline"
                className="text-xs font-normal shrink-0"
                style={{
                  borderColor: getNetworkColor(questionnaire.chainId),
                  color: getNetworkColor(questionnaire.chainId),
                }}
              >
                {getNetworkName(questionnaire.chainId)}
              </Badge>
            </div>
            {questionnaire.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {questionnaire.description}
              </p>
            )}
          </div>
          <Badge className={cn("ml-2 shrink-0", statusColors[questionnaire.status])}>
            {questionnaire.status}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {questionnaire.creatorAddress.slice(2, 4).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground">
              {questionnaire.creatorAddress.slice(0, 6)}...
              {questionnaire.creatorAddress.slice(-4)}
            </span>
          </div>
          {questionnaire.category && (
            <Badge variant="outline" className="text-xs">
              {questionnaire.category}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar for participants */}
        {progress?.started && !showCreatorActions && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {progress.pollsAnswered.length} / {questionnaire.pollCount} polls
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            {isCompleted && (
              <div className="flex items-center gap-1.5 text-green-500 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>Completed</span>
              </div>
            )}
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Polls:</span>
            <span className="font-medium">{questionnaire.pollCount}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Completions:</span>
            <span className="font-medium">{questionnaire.completionCount}</span>
          </div>

          {questionnaire.totalRewardAmount && questionnaire.totalRewardAmount !== "0" && (
            <div className="flex items-center gap-2 text-sm col-span-2">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Reward:</span>
              <span className="font-medium">
                {formatRewardDisplay(parseFloat(questionnaire.totalRewardAmount))}
              </span>
            </div>
          )}

          {daysRemaining !== null && questionnaire.status === "active" && (
            <div className="flex items-center gap-2 text-sm col-span-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {daysRemaining === 0
                  ? "Ends today"
                  : daysRemaining === 1
                  ? "1 day left"
                  : `${daysRemaining} days left`}
              </span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        {showCreatorActions ? (
          <>
            {/* Publish/Unpublish Toggle */}
            {questionnaire.status !== "archived" && onToggleStatus && (
              <Button
                variant={questionnaire.status === "active" ? "outline" : "default"}
                size="sm"
                onClick={() => onToggleStatus(
                  questionnaire.id,
                  questionnaire.status === "active" ? "draft" : "active"
                )}
                disabled={isTogglingStatus}
              >
                {questionnaire.status === "active" ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-1" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    Publish
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onEdit?.(questionnaire.id)}
            >
              Edit
            </Button>
            {questionnaire.status !== "archived" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onArchive?.(questionnaire.id)}
              >
                Archive
              </Button>
            )}
          </>
        ) : (
          <Link href={`/dapp/questionnaires/${questionnaire.id}`} className="w-full">
            <Button
              variant={isCompleted ? "outline" : "default"}
              size="sm"
              className="w-full"
            >
              {isCompleted ? (
                <>
                  View Results
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : progress?.started ? (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Start Questionnaire
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  )
}
