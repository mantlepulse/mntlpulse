/**
 * Edit Poll Title Dialog
 * Allows creators to set a custom display title for their polls
 */

"use client"

import { useState } from "react"
import { Loader2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface EditPollTitleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pollId: bigint
  chainId: number
  currentTitle: string
  displayTitle?: string | null
  creatorAddress: string
  onSuccess?: (newTitle: string) => void
}

export function EditPollTitleDialog({
  open,
  onOpenChange,
  pollId,
  chainId,
  currentTitle,
  displayTitle,
  creatorAddress,
  onSuccess,
}: EditPollTitleDialogProps) {
  const [title, setTitle] = useState(displayTitle || currentTitle)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error("Title cannot be empty")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/polls/display-title", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayTitle: title.trim(),
          chainId,
          pollId: pollId.toString(),
          creatorAddress,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update title")
      }

      toast.success("Poll title updated successfully")
      onSuccess?.(title.trim())
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update poll title:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update title")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/polls/display-title", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayTitle: null,
          chainId,
          pollId: pollId.toString(),
          creatorAddress,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to reset title")
      }

      toast.success("Title reset to original")
      setTitle(currentTitle)
      onSuccess?.(currentTitle)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to reset poll title:", error)
      toast.error(error instanceof Error ? error.message : "Failed to reset title")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Poll Title
          </DialogTitle>
          <DialogDescription>
            Update the display title for your poll. This won&apos;t change the on-chain data.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Display Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter poll title"
                maxLength={500}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/500 characters
              </p>
            </div>

            {displayTitle && displayTitle !== currentTitle && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium">Original title:</span>{" "}
                  {currentTitle}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {displayTitle && (
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                Reset to Original
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Title"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
