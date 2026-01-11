"use client"

import { UseFormReturn } from "react-hook-form"
import { PollSelector, type SelectedPoll } from "./poll-selector"
import { SelectedPollsList } from "./selected-polls-list"
import type { QuestionnaireFormData } from "./questionnaire-creation-form"

interface StepAddPollsProps {
  form: UseFormReturn<QuestionnaireFormData>
  excludeQuestionnaireId?: string // When editing, exclude the current questionnaire from "already in questionnaire" check
}

export function StepAddPolls({ form, excludeQuestionnaireId }: StepAddPollsProps) {
  const polls = form.watch("polls") || []

  const handleAddPoll = (poll: SelectedPoll) => {
    const currentPolls = form.getValues("polls") || []
    form.setValue("polls", [...currentPolls, poll], { shouldValidate: true })
  }

  const handleReorder = (reorderedPolls: SelectedPoll[]) => {
    form.setValue("polls", reorderedPolls, { shouldValidate: true })
  }

  const handleRemove = (pollId: string, chainId: number) => {
    const currentPolls = form.getValues("polls") || []
    const filteredPolls = currentPolls
      .filter((p) => !(p.pollId === pollId && p.chainId === chainId))
      .map((p, index) => ({ ...p, sortOrder: index }))
    form.setValue("polls", filteredPolls, { shouldValidate: true })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Add Polls</h2>
        <p className="text-muted-foreground">
          Click on polls from the left to add them. Drag polls on the right to reorder.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Poll Selector */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Your Polls</h3>
          <PollSelector
            selectedPolls={polls}
            onAddPoll={handleAddPoll}
            excludeQuestionnaireId={excludeQuestionnaireId}
          />
        </div>

        {/* Selected Polls */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Questionnaire Order</h3>
          <SelectedPollsList
            polls={polls}
            onReorder={handleReorder}
            onRemove={handleRemove}
          />
        </div>
      </div>

      {form.formState.errors.polls && (
        <p className="text-sm text-destructive">
          {form.formState.errors.polls.message}
        </p>
      )}
    </div>
  )
}
