"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Circle, ChevronLeft, ChevronRight } from "lucide-react"

interface Poll {
  chainId: number
  pollId: number
  sortOrder: number
}

interface QuestionnairePollStepperProps {
  polls: Poll[]
  currentIndex: number
  answeredPollIds: string[]
  onNavigate: (index: number) => void
  disabled?: boolean
}

export function QuestionnairePollStepper({
  polls,
  currentIndex,
  answeredPollIds,
  onNavigate,
  disabled,
}: QuestionnairePollStepperProps) {
  const canGoBack = currentIndex > 0
  const canGoForward = currentIndex < polls.length - 1

  const isPollAnswered = (poll: Poll) => {
    return answeredPollIds.includes(`${poll.chainId}-${poll.pollId}`)
  }

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        {polls.map((poll, index) => {
          const isAnswered = isPollAnswered(poll)
          const isCurrent = index === currentIndex
          const isClickable = isAnswered || index <= currentIndex

          return (
            <button
              key={`${poll.chainId}-${poll.pollId}`}
              onClick={() => isClickable && !disabled && onNavigate(index)}
              disabled={!isClickable || disabled}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full transition-all",
                isCurrent && "ring-2 ring-primary ring-offset-2",
                isAnswered && "bg-green-500 text-white",
                !isAnswered && isCurrent && "bg-primary text-primary-foreground",
                !isAnswered && !isCurrent && "bg-muted text-muted-foreground",
                isClickable && !disabled && "cursor-pointer hover:opacity-80",
                (!isClickable || disabled) && "cursor-not-allowed opacity-50"
              )}
            >
              {isAnswered ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Navigation arrows */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate(currentIndex - 1)}
          disabled={!canGoBack || disabled}
          className={!canGoBack ? "invisible" : ""}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <span className="text-sm text-muted-foreground">
          Poll {currentIndex + 1} of {polls.length}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate(currentIndex + 1)}
          disabled={!canGoForward || disabled}
          className={!canGoForward ? "invisible" : ""}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
