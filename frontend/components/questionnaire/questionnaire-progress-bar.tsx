"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle } from "lucide-react"

interface QuestionnaireProgressBarProps {
  totalPolls: number
  answeredPolls: number
  isComplete: boolean
}

export function QuestionnaireProgressBar({
  totalPolls,
  answeredPolls,
  isComplete,
}: QuestionnaireProgressBarProps) {
  const percentage = totalPolls > 0 ? Math.round((answeredPolls / totalPolls) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {isComplete ? "Completed!" : "Progress"}
          </span>
        </div>
        <Badge variant={isComplete ? "default" : "secondary"}>
          {answeredPolls}/{totalPolls} polls
        </Badge>
      </div>
      <Progress value={percentage} className="h-2" />
      <p className="text-xs text-muted-foreground text-right">{percentage}% complete</p>
    </div>
  )
}
