/**
 * Stepper Component
 * Visual indicator for multi-step processes
 */

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Step {
  title: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  className?: string
  onStepClick?: (step: number) => void
}

export function Stepper({ steps, currentStep, className, onStepClick }: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol role="list" className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isFuture = stepNumber > currentStep
          const isClickable = onStepClick && stepNumber < currentStep

          return (
            <li
              key={step.title}
              className={cn(
                "relative flex-1",
                index !== steps.length - 1 && "pr-8 sm:pr-20"
              )}
            >
              {/* Connector line */}
              {index !== steps.length - 1 && (
                <div
                  className="absolute left-8 top-4 -ml-px mt-0.5 h-0.5 w-full"
                  aria-hidden="true"
                >
                  <div
                    className={cn(
                      "h-full",
                      isCompleted ? "bg-primary" : "bg-muted"
                    )}
                  />
                </div>
              )}

              {/* Step button/indicator */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(stepNumber)}
                disabled={!isClickable}
                className={cn(
                  "group relative flex w-full items-center",
                  isClickable && "cursor-pointer"
                )}
              >
                <span className="flex items-center">
                  {/* Step circle */}
                  <span
                    className={cn(
                      "relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2",
                      isCompleted &&
                        "border-primary bg-primary text-primary-foreground",
                      isCurrent &&
                        "border-primary bg-background text-primary",
                      isFuture &&
                        "border-muted-foreground/30 bg-background text-muted-foreground",
                      isClickable && "group-hover:border-primary/80"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-medium">{stepNumber}</span>
                    )}
                  </span>

                  {/* Step label */}
                  <span className="ml-4 flex min-w-0 flex-col">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isCompleted && "text-primary",
                        isCurrent && "text-foreground",
                        isFuture && "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                    {step.description && (
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {step.description}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
