"use client"

import { useEffect } from "react"
import { UseFormReturn } from "react-hook-form"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RewardDistributionSliders, type RewardDistribution } from "./reward-distribution-sliders"
import type { QuestionnaireFormData } from "./questionnaire-creation-form"
import { TOKEN_INFO } from "@/lib/contracts/token-config"

interface StepRewardsProps {
  form: UseFormReturn<QuestionnaireFormData>
}

export function StepRewards({ form }: StepRewardsProps) {
  const polls = form.watch("polls") || []
  const totalRewardAmount = form.watch("totalRewardAmount") || "0"
  const rewardDistribution = form.watch("rewardDistribution") || []

  // Initialize distribution when polls change
  useEffect(() => {
    if (polls.length > 0 && rewardDistribution.length !== polls.length) {
      const equalPercentage = 100 / polls.length
      const newDistribution: RewardDistribution[] = polls.map((poll) => ({
        chainId: poll.chainId,
        pollId: poll.pollId,
        percentage: equalPercentage,
        locked: false,
      }))
      form.setValue("rewardDistribution", newDistribution)
    }
  }, [polls, rewardDistribution.length, form])

  const handleDistributionChange = (distribution: RewardDistribution[]) => {
    form.setValue("rewardDistribution", distribution, { shouldValidate: true })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Reward Configuration</h2>
        <p className="text-muted-foreground">
          Set the total reward pool and how it&apos;s distributed among polls
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="totalRewardAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Reward Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Total tokens to distribute (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fundingToken"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Funding Token</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(TOKEN_INFO).map(([symbol, token]) => (
                    <SelectItem key={symbol} value={symbol}>
                      {token.symbol} - {token.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Token used for rewards
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {polls.length > 0 && (
        <RewardDistributionSliders
          polls={polls}
          totalRewardAmount={totalRewardAmount}
          distribution={rewardDistribution}
          onChange={handleDistributionChange}
        />
      )}

      {polls.length === 0 && (
        <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
          Add polls in the previous step to configure reward distribution
        </div>
      )}
    </div>
  )
}
