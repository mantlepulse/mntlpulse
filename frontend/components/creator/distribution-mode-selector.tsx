/**
 * Distribution Mode Selector Component
 * Allows creators to set the distribution mode for their polls
 */

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

type DistributionMode = "0" | "1" | "2" // MANUAL_PULL, MANUAL_PUSH, AUTOMATED

interface DistributionModeSelectorProps {
  pollId: bigint
  currentMode: DistributionMode
  onModeChange: (pollId: bigint, mode: number) => Promise<void>
  isPending?: boolean
}

export function DistributionModeSelector({
  pollId,
  currentMode,
  onModeChange,
  isPending = false,
}: DistributionModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<DistributionMode>(currentMode)

  const handleSubmit = async () => {
    if (selectedMode === currentMode) {
      toast.info("Mode is already set to this value")
      return
    }

    try {
      await onModeChange(pollId, parseInt(selectedMode))
      toast.success("Distribution mode updated successfully")
    } catch (error) {
      console.error("Failed to update distribution mode:", error)
      toast.error("Failed to update distribution mode")
    }
  }

  const modes = [
    {
      value: "0" as DistributionMode,
      label: "Manual Pull",
      description: "Responders claim their own rewards when ready",
      details: "Best for: Giving users control over when they receive rewards. Creator manually withdraws to single address.",
    },
    {
      value: "1" as DistributionMode,
      label: "Manual Push",
      description: "You manually distribute rewards to responders",
      details: "Best for: Custom distribution logic or curated reward allocation. Creator manually distributes to multiple recipients.",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribution Mode</CardTitle>
        <CardDescription>
          Choose how rewards will be distributed to responders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={selectedMode} onValueChange={(value) => setSelectedMode(value as DistributionMode)}>
          <div className="space-y-3">
            {modes.map((mode) => (
              <div
                key={mode.value}
                className="flex items-start space-x-3 space-y-0"
              >
                <RadioGroupItem value={mode.value} id={`mode-${mode.value}`} />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={`mode-${mode.value}`}
                    className="font-medium cursor-pointer"
                  >
                    {mode.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {mode.description}
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    {mode.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </RadioGroup>

        <Button
          onClick={handleSubmit}
          disabled={isPending || selectedMode === currentMode}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Distribution Mode"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
