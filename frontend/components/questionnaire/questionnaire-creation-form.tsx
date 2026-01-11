"use client"

import { useState, useEffect } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Stepper, Step } from "@/components/ui/stepper"
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"

import { StepBasicInfo } from "./step-basic-info"
import { StepAddPolls } from "./step-add-polls"
import { StepRewards } from "./step-rewards"
import { StepReview } from "./step-review"
import { useCreateQuestionnaire, useAddPollToQuestionnaire, useUpdateRewardDistribution } from "@/hooks/use-questionnaires"
import type { SelectedPoll } from "./poll-selector"
import type { RewardDistribution } from "./reward-distribution-sliders"

// Form schema
const questionnaireFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().optional(),
  category: z.string().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  polls: z.array(z.object({
    chainId: z.number(),
    pollId: z.string(),
    question: z.string(),
    source: z.enum(["new", "existing"]),
    sortOrder: z.number(),
  })).min(1, "Add at least one poll to your questionnaire"),
  totalRewardAmount: z.string().optional(),
  fundingToken: z.string().optional(),
  rewardDistribution: z.array(z.object({
    chainId: z.number(),
    pollId: z.string(),
    percentage: z.number(),
    locked: z.boolean(),
  })).optional(),
})

export type QuestionnaireFormData = z.infer<typeof questionnaireFormSchema>

const STEPS: Step[] = [
  { title: "Basic Info", description: "Title & timing" },
  { title: "Add Polls", description: "Select polls" },
  { title: "Rewards", description: "Distribution" },
  { title: "Review", description: "Submit" },
]

export function QuestionnaireCreationForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const { isConnected, address } = useAccount()
  const router = useRouter()

  const createQuestionnaireMutation = useCreateQuestionnaire()
  const addPollMutation = useAddPollToQuestionnaire()
  const updateRewardsMutation = useUpdateRewardDistribution()

  const isSubmitting = createQuestionnaireMutation.isPending || addPollMutation.isPending || updateRewardsMutation.isPending

  const form = useForm<QuestionnaireFormData>({
    resolver: zodResolver(questionnaireFormSchema),
    mode: "onTouched",
    defaultValues: {
      title: "",
      description: "",
      category: "",
      polls: [],
      totalRewardAmount: "0",
      fundingToken: "PULSE",
      rewardDistribution: [],
    },
  })

  const { trigger, getValues, formState: { errors } } = form

  // Validate current step before proceeding
  const validateStep = async (step: number): Promise<boolean> => {
    if (step === 1) {
      const isValid = await trigger(["title"])
      const values = getValues()

      if (!isValid || !values.title?.trim()) {
        toast.error("Questionnaire title is required")
        return false
      }

      // Validate dates if both are set
      if (values.startTime && values.endTime && values.startTime >= values.endTime) {
        toast.error("End date must be after start date")
        return false
      }

      return true
    }

    if (step === 2) {
      const values = getValues()
      if (!values.polls || values.polls.length === 0) {
        toast.error("Add at least one poll to your questionnaire")
        return false
      }
      return true
    }

    if (step === 3) {
      const values = getValues()
      const distribution = values.rewardDistribution || []
      const totalPercentage = distribution.reduce((sum, d) => sum + d.percentage, 0)

      // Only validate if rewards are configured
      if (values.totalRewardAmount && parseFloat(values.totalRewardAmount) > 0) {
        if (Math.abs(totalPercentage - 100) > 0.01) {
          toast.error("Reward distribution must total 100%")
          return false
        }
      }
      return true
    }

    return true
  }

  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length))
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleStepClick = (step: number) => {
    // Only allow going back to completed steps
    if (step < currentStep) {
      setCurrentStep(step)
    }
  }

  const onSubmit = async (data: QuestionnaireFormData) => {
    if (!isConnected) {
      toast.error("Please connect your wallet to create a questionnaire")
      return
    }

    // Validate all steps
    for (let i = 1; i <= 3; i++) {
      if (!(await validateStep(i))) {
        setCurrentStep(i)
        return
      }
    }

    try {
      // Step 1: Create the questionnaire
      const questionnaire = await createQuestionnaireMutation.mutateAsync({
        title: data.title,
        description: data.description,
        category: data.category,
        startTime: data.startTime?.toISOString(),
        endTime: data.endTime?.toISOString(),
        totalRewardAmount: data.totalRewardAmount || "0",
        fundingToken: data.fundingToken,
      })

      // Step 2: Add polls to the questionnaire
      for (const poll of data.polls) {
        await addPollMutation.mutateAsync({
          questionnaireId: questionnaire.id,
          chainId: poll.chainId,
          pollId: parseInt(poll.pollId),
          sortOrder: poll.sortOrder,
          source: poll.source,
        })
      }

      // Step 3: Update reward distribution if configured
      if (data.rewardDistribution && data.rewardDistribution.length > 0 &&
          data.totalRewardAmount && parseFloat(data.totalRewardAmount) > 0) {
        await updateRewardsMutation.mutateAsync({
          questionnaireId: questionnaire.id,
          distribution: data.rewardDistribution.map((d) => ({
            chainId: d.chainId,
            pollId: parseInt(d.pollId),
            percentage: d.percentage.toString(),
          })),
        })
      }

      toast.success("Questionnaire created successfully!")
      router.push("/dapp/questionnaires")
    } catch (error) {
      console.error("Error creating questionnaire:", error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Failed to create questionnaire. Please try again.")
      }
    }
  }

  // Handle success from create mutation
  useEffect(() => {
    if (createQuestionnaireMutation.isSuccess) {
      // Reset handled in onSubmit after full flow completes
    }
  }, [createQuestionnaireMutation.isSuccess])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Create Questionnaire</h1>
        <p className="text-muted-foreground text-lg">
          Group multiple polls together for participants to answer in sequence
        </p>
      </div>

      {/* Stepper */}
      <Stepper
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        className="mb-8"
      />

      <FormProvider {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
          {/* Render current step */}
          {currentStep === 1 && <StepBasicInfo form={form} />}
          {currentStep === 2 && <StepAddPolls form={form} />}
          {currentStep === 3 && <StepRewards form={form} />}
          {currentStep === 4 && <StepReview form={form} />}

          {/* Wallet Warning */}
          {!isConnected && currentStep === 4 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  Wallet not connected
                </span>
              </div>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Please connect your wallet to create a questionnaire
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleBack}
              disabled={currentStep === 1 || isSubmitting}
              className={currentStep === 1 ? "invisible" : ""}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex gap-4">
              {currentStep < STEPS.length ? (
                <Button type="button" size="lg" onClick={handleNext} disabled={isSubmitting}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  disabled={isSubmitting || !isConnected}
                  onClick={form.handleSubmit(onSubmit)}
                >
                  {createQuestionnaireMutation.isPending && "Creating questionnaire..."}
                  {addPollMutation.isPending && "Adding polls..."}
                  {updateRewardsMutation.isPending && "Updating rewards..."}
                  {!isSubmitting && "Create Questionnaire"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}
