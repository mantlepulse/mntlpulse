"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Stepper, Step } from "@/components/ui/stepper"
import { CalendarIcon, Plus, X, Info, Coins, Users, Clock, AlertCircle, Sparkles, Lock, ChevronLeft, ChevronRight, Send, FileEdit } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useCreatePoll, useCreatePollWithFunding, usePlatformFee, usePollsContractAddress, useTokenApproval, useTokenAllowance } from "@/lib/contracts/polls-contract-utils"
import { useAccount, useChainId, useBalance } from "wagmi"
import { Address, parseUnits, formatUnits } from "viem"
import { MIN_POLL_DURATION, MAX_POLL_DURATION, FundingType, VotingType } from "@/lib/contracts/polls-contract"
import { useIsPremiumOrStaked } from "@/lib/contracts/premium-contract-utils"
import { useRouter } from "next/navigation"
import { TOKEN_INFO, getSupportedTokens, getTokenAddress } from "@/lib/contracts/token-config"

const pollSchema = z.object({
  title: z.string().min(1, "Poll title is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  options: z
    .array(z.string().min(1, "Option cannot be empty"))
    .min(2, "At least 2 options required")
    .max(10, "Maximum 10 options allowed"),
  endDate: z.date().optional(),
  fundingType: z.enum(["none", "self", "community"]),
  fundingToken: z.string().optional(),
  rewardAmount: z.coerce.number().min(0).optional(),
  votingType: z.enum(["linear", "quadratic"]),
  publish: z.boolean(),
  // New funding fields
  expectedResponses: z.coerce.number().min(1).optional(),
  rewardPerResponse: z.coerce.number().min(0).optional(),
  fundNow: z.boolean().default(true),
})

// Platform fee percentage (will be fetched from contract, default to 5%)
const DEFAULT_PLATFORM_FEE_PERCENT = 500 // 5% in basis points

type PollFormData = z.infer<typeof pollSchema>

const categories = ["Governance", "Community", "Product", "Events", "General", "Technical", "Marketing", "Partnership"]

const STEPS: Step[] = [
  { title: "Basic Info", description: "Title, description & timing" },
  { title: "Options", description: "Poll choices" },
  { title: "Settings", description: "Voting type & funding" },
]

export function PollCreationForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [options, setOptions] = useState<string[]>(["", ""])
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const { isConnected, address } = useAccount()
  const contractAddress = usePollsContractAddress()
  const chainId = useChainId()
  const { createPoll, isPending, isConfirming, isSuccess, error } = useCreatePoll()
  const { createPollWithFunding, isPending: isFundingPending, isConfirming: isFundingConfirming, isSuccess: isFundingSuccess, error: fundingError } = useCreatePollWithFunding()
  const { approve: approveToken, isPending: isApproving, isSuccess: isApproveSuccess } = useTokenApproval()
  const router = useRouter()

  // Check if user has premium access (subscription or staking)
  const { data: isPremiumData, isLoading: isPremiumLoading } = useIsPremiumOrStaked(address)
  const isPremium = isPremiumData as boolean | undefined

  // Get platform fee from contract
  const { data: platformFeeData } = usePlatformFee()
  const platformFeePercent = platformFeeData ? Number(platformFeeData) : DEFAULT_PLATFORM_FEE_PERCENT

  // Get supported tokens for the current chain
  const supportedTokens = getSupportedTokens(chainId)

  // State for approval flow
  const [needsApproval, setNeedsApproval] = useState(false)
  const [approvalPending, setApprovalPending] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<PollFormData>({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      category: "",
      fundingType: "none",
      fundingToken: "PULSE",
      options: ["", ""],
      rewardAmount: 0,
      votingType: "linear",
      publish: true,
      expectedResponses: 10,
      rewardPerResponse: 1,
      fundNow: true,
    },
  })

  const fundingType = watch("fundingType")
  const fundingToken = watch("fundingToken")
  const endDate = watch("endDate")
  const expectedResponses = watch("expectedResponses") || 0
  const rewardPerResponse = watch("rewardPerResponse") || 0
  const fundNow = watch("fundNow")

  // Calculate funding amounts
  const rewardPool = expectedResponses * rewardPerResponse
  const platformFee = (rewardPool * platformFeePercent) / 10000
  const totalFunding = rewardPool + platformFee
  const category = watch("category")
  const votingType = watch("votingType")
  const title = watch("title")
  const publish = watch("publish")

  // Get funding token address for allowance check
  const fundingTokenAddress = fundingToken && fundingToken !== "ETH" && fundingToken !== "MNT"
    ? getTokenAddress(chainId, fundingToken)
    : undefined

  // Check token allowance for ERC20 tokens
  const { data: allowanceData, refetch: refetchAllowance } = useTokenAllowance(
    fundingTokenAddress,
    address,
    contractAddress
  )

  // Calculate if approval is needed
  const tokenInfo = TOKEN_INFO[fundingToken as keyof typeof TOKEN_INFO]
  const decimals = tokenInfo?.decimals || 18
  const fundingAmountWei = totalFunding > 0 ? parseUnits(totalFunding.toString(), decimals) : BigInt(0)
  const currentAllowance = allowanceData ? BigInt(allowanceData.toString()) : BigInt(0)
  const isERC20Token = fundingToken && fundingToken !== "ETH" && fundingToken !== "MNT"
  const needsTokenApproval = isERC20Token && fundNow && fundingType === "self" && totalFunding > 0 && currentAllowance < fundingAmountWei

  const isSubmitting = isPending || isConfirming || isFundingPending || isFundingConfirming || isApproving || approvalPending

  const addOption = () => {
    if (options.length < 10) {
      const newOptions = [...options, ""]
      setOptions(newOptions)
      setValue("options", newOptions, { shouldValidate: true })
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index)
      setOptions(newOptions)
      setValue("options", newOptions, { shouldValidate: true })
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
    setValue("options", newOptions, { shouldValidate: true })
  }

  // Validate current step before proceeding
  const validateStep = async (step: number): Promise<boolean> => {
    if (step === 1) {
      // Trigger validation for step 1 fields
      await trigger(["title", "endDate"])
      const data = getValues()

      if (!data.title?.trim()) {
        toast.error("Poll title is required")
        return false
      }
      if (!data.endDate) {
        toast.error("End date is required")
        return false
      }
      const now = new Date()
      if (data.endDate <= now) {
        toast.error("End date must be in the future")
        return false
      }
      return true
    }

    if (step === 2) {
      const validOptions = options.filter(opt => opt && opt.trim() !== "")
      if (validOptions.length < 2) {
        toast.error("At least 2 non-empty poll options are required")
        return false
      }
      return true
    }

    return true
  }

  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleStepClick = (step: number) => {
    // Only allow going back to completed steps
    if (step < currentStep) {
      setCurrentStep(step)
    }
  }

  // Handle token approval for ERC20 tokens
  const handleApproval = async () => {
    if (!fundingTokenAddress || !contractAddress) {
      toast.error("Token or contract address not available")
      return
    }

    try {
      setApprovalPending(true)
      await approveToken(
        fundingTokenAddress,
        contractAddress,
        totalFunding.toString(),
        decimals
      )
    } catch (error) {
      console.error("Approval error:", error)
      setApprovalPending(false)
      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          toast.error("Approval was rejected by user")
        } else {
          toast.error(`Approval failed: ${error.message}`)
        }
      } else {
        toast.error("Failed to approve token. Please try again.")
      }
    }
  }

  const onSubmit = async (data: PollFormData) => {

    if (!isConnected) {
      toast.error("Please connect your wallet to create a poll")
      return
    }

    if (!contractAddress) {
      toast.error("Contract not available on this network")
      return
    }

    // Validate all steps
    if (!(await validateStep(1)) || !(await validateStep(2))) {
      return
    }

    console.log("Passed all validations, about to call createPoll...")
    const validOptions = options.filter(opt => opt && opt.trim() !== "")

    try {
      // Calculate duration in hours
      const now = new Date()
      const durationInHours = Math.ceil((data.endDate!.getTime() - now.getTime()) / (1000 * 60 * 60))

      if (durationInHours <= 0) {
        toast.error("End date must be in the future")
        return
      }

      if (durationInHours < 1) {
        toast.error("Poll must run for at least 1 hour")
        return
      }

      if (durationInHours > 24 * 30) {
        toast.error("Poll duration cannot exceed 30 days")
        return
      }

      // Determine the funding token address
      let fundingTokenAddress: Address
      if (data.fundingType === "none" || data.fundingType === "community") {
        fundingTokenAddress = '0x0000000000000000000000000000000000000000' as Address
      } else if (data.fundingToken === "ETH") {
        fundingTokenAddress = '0x0000000000000000000000000000000000000000' as Address
      } else {
        if (!data.fundingToken) {
          toast.error("Please select a funding token")
          return
        }
        const tokenAddress = getTokenAddress(chainId, data.fundingToken)
        if (!tokenAddress) {
          toast.error(`Token ${data.fundingToken} not available on this network`)
          return
        }
        fundingTokenAddress = tokenAddress
      }

      // Convert funding type string to enum
      let fundingTypeEnum: FundingType
      if (data.fundingType === "none") {
        fundingTypeEnum = FundingType.NONE
      } else if (data.fundingType === "self") {
        fundingTypeEnum = FundingType.SELF
      } else {
        fundingTypeEnum = FundingType.COMMUNITY
      }

      // Convert voting type string to enum
      const votingTypeEnum = data.votingType === "quadratic" ? VotingType.QUADRATIC : VotingType.LINEAR

      // Validate premium access for quadratic voting
      if (votingTypeEnum === VotingType.QUADRATIC && !isPremium) {
        toast.error("Premium access required to create quadratic voting polls")
        return
      }

      // Check if we should fund during creation
      const shouldFundNow = data.fundNow && data.fundingType === "self" && totalFunding > 0

      if (shouldFundNow) {
        // Get token decimals for parsing amount
        const tokenInfo = TOKEN_INFO[data.fundingToken as keyof typeof TOKEN_INFO]
        const decimals = tokenInfo?.decimals || 18
        const fundingAmountWei = parseUnits(totalFunding.toString(), decimals)

        // Calculate expectedResponses and rewardPerResponse in wei
        const expectedResponsesValue = BigInt(data.expectedResponses || 0)
        const rewardPerResponseWei = data.rewardPerResponse && data.rewardPerResponse > 0
          ? parseUnits(data.rewardPerResponse.toString(), decimals)
          : BigInt(0)

        // Create poll with funding in a single transaction
        await createPollWithFunding(
          data.title,
          validOptions,
          durationInHours,
          fundingTokenAddress,
          fundingTypeEnum,
          votingTypeEnum,
          data.publish,
          fundingAmountWei,
          expectedResponsesValue,
          rewardPerResponseWei
        )
      } else {
        // Create poll without funding
        await createPoll(data.title, validOptions, durationInHours, fundingTokenAddress, fundingTypeEnum, votingTypeEnum, data.publish)
      }

    } catch (error) {
      console.error("Error creating poll:", error)

      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          toast.error("Transaction was rejected by user")
        } else if (error.message.includes("insufficient funds")) {
          toast.error("Insufficient funds for transaction")
        } else if (error.message.includes("gas")) {
          toast.error("Gas estimation failed. Check network connection.")
        } else {
          toast.error(`Transaction failed: ${error.message}`)
        }
      } else {
        toast.error("Failed to create poll. Please try again.")
      }
    }
  }

  // Handle success
  useEffect(() => {
    if (isSuccess || isFundingSuccess) {
      toast.success(isFundingSuccess ? "Poll created and funded successfully!" : "Poll created successfully!")
      setOptions(["", ""])
      setCurrentStep(1)
      reset({
        title: "",
        description: "",
        category: "",
        fundingType: "none",
        options: ["", ""],
        votingType: "linear",
        publish: true,
        expectedResponses: 10,
        rewardPerResponse: 1,
        fundNow: true,
      })
      router.push("/dapp")
    }
  }, [isSuccess, isFundingSuccess, reset, router])

  // Handle approval success - refetch allowance
  useEffect(() => {
    if (isApproveSuccess) {
      toast.success("Token approval successful! You can now create your poll.")
      setApprovalPending(false)
      refetchAllowance()
    }
  }, [isApproveSuccess, refetchAllowance])

  // Handle error
  if (error) {
    console.error("Contract error:", error)
  }

  // Step 1: Basic Information
  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>Provide the essential details for your poll</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Poll Title *</Label>
          <Input
            id="title"
            placeholder="What should we decide on?"
            value={watch("title") || ""}
            onChange={(e) => setValue("title", e.target.value, { shouldValidate: true })}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            className={errors.title ? "border-destructive" : ""}
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Provide more context about what this poll is about and why it matters..."
            rows={4}
            value={watch("description") || ""}
            onChange={(e) => setValue("description", e.target.value, { shouldValidate: true })}
            className={errors.description ? "border-destructive" : ""}
          />
          {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={(value) => setValue("category", value, { shouldValidate: true })}
            >
              <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>End Date *</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal text-foreground hover:text-foreground",
                    !endDate && "opacity-70 hover:opacity-100",
                    errors.endDate && "border-destructive",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Pick an end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    if (date) {
                      setValue("endDate", date, { shouldValidate: true })
                      setIsCalendarOpen(false)
                    }
                  }}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Step 2: Poll Options
  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Poll Options</CardTitle>
        <CardDescription>Add the choices that people can vote on (2-10 options)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder={`Option ${index + 1}`}
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                className={errors.options?.[index] ? "border-destructive" : ""}
              />
              {errors.options?.[index] && (
                <p className="text-sm text-destructive mt-1">{errors.options[index]?.message}</p>
              )}
            </div>
            {options.length > 2 && (
              <Button type="button" variant="outline" size="icon" onClick={() => removeOption(index)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {options.length < 10 && (
          <Button type="button" variant="outline" onClick={addOption} className="w-full bg-transparent">
            <Plus className="h-4 w-4 mr-2" />
            Add Option
          </Button>
        )}

        {errors.options && <p className="text-sm text-destructive">{errors.options.message}</p>}

        {/* Preview summary */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Preview</h4>
          <p className="text-sm text-muted-foreground mb-3">{title || "Your poll question"}</p>
          <div className="space-y-2">
            {options.filter(o => o.trim()).map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded-full border-2 border-primary/50" />
                <span>{opt}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Step 3: Voting Type & Funding
  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Voting Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Voting Type
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Beta
            </Badge>
          </CardTitle>
          <CardDescription>Choose how votes are counted in your poll</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={votingType}
            onValueChange={(value) => setValue("votingType", value as "linear" | "quadratic", { shouldValidate: true })}
            className="space-y-4"
          >
            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <RadioGroupItem value="linear" id="linear" className="mt-1" type="button" />
              <div className="flex-1">
                <Label htmlFor="linear" className="font-medium cursor-pointer">
                  Linear Voting (Default)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Traditional one person, one vote. Every participant gets equal voting power.
                </p>
                <Badge variant="secondary" className="mt-2">
                  <Users className="h-3 w-3 mr-1" />
                  Equal Voice
                </Badge>
              </div>
            </div>

            <div
              className={cn(
                "flex items-start space-x-3 p-4 border rounded-lg transition-opacity",
                !isPremium && "opacity-60"
              )}
            >
              <RadioGroupItem
                value="quadratic"
                id="quadratic"
                className="mt-1"
                type="button"
                disabled={!isPremium && !isPremiumLoading}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="quadratic" className={cn("font-medium", !isPremium && "cursor-not-allowed")}>
                    Quadratic Voting
                  </Label>
                  {!isPremium && !isPremiumLoading && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      <Lock className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Voters buy votes with PULSE tokens. Cost increases quadratically (1, 4, 9, 16...)
                  to prevent vote buying and encourage broader participation.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary">
                    <Coins className="h-3 w-3 mr-1" />
                    Pay-per-Vote
                  </Badge>
                  <Badge variant="secondary">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Fair Influence
                  </Badge>
                </div>
                {!isPremium && !isPremiumLoading && (
                  <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-md">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Unlock quadratic voting by subscribing to Premium or staking 10,000+ PULSE tokens.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>

          {votingType === "quadratic" && isPremium && (
            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-primary">Quadratic Voting Selected</p>
                <p className="text-muted-foreground mt-1">
                  Voters will need PULSE tokens to participate. The cost for each additional vote
                  increases by the square: 1st vote = 1 PULSE, 2nd = 4 PULSE, 3rd = 9 PULSE, etc.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Funding Options */}
      <Card>
        <CardHeader>
          <CardTitle>Funding & Incentives</CardTitle>
          <CardDescription>Choose how to incentivize participation in your poll</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={fundingType}
            onValueChange={(value) => setValue("fundingType", value as "none" | "self" | "community", { shouldValidate: true })}
            className="space-y-4"
          >
            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <RadioGroupItem value="none" id="none" className="mt-1" type="button" />
              <div className="flex-1">
                <Label htmlFor="none" className="font-medium cursor-pointer">
                  No Rewards
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Free poll with no financial incentives. Great for simple community decisions.
                </p>
                <Badge variant="secondary" className="mt-2">
                  <Users className="h-3 w-3 mr-1" />
                  Community Driven
                </Badge>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <RadioGroupItem value="self" id="self" className="mt-1" type="button" />
              <div className="flex-1">
                <Label htmlFor="self" className="font-medium cursor-pointer">
                  Self-Funded
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  You provide the reward pool. Participants share the rewards based on their contribution.
                </p>
                <Badge variant="secondary" className="mt-2">
                  <Coins className="h-3 w-3 mr-1" />
                  Your Investment
                </Badge>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <RadioGroupItem value="community" id="community" className="mt-1" type="button" />
              <div className="flex-1">
                <Label htmlFor="community" className="font-medium cursor-pointer">
                  Community Fund
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Rewards come from the community treasury. Requires governance approval.
                </p>
                <Badge variant="secondary" className="mt-2">
                  <Clock className="h-3 w-3 mr-1" />
                  Approval Required
                </Badge>
              </div>
            </div>
          </RadioGroup>

          {fundingType === "self" && (
            <div className="space-y-4">
              {/* Funding Token Selection */}
              <div className="space-y-2">
                <Label htmlFor="fundingToken">Funding Token</Label>
                <Select
                  value={fundingToken}
                  onValueChange={(value) => setValue("fundingToken", value, { shouldValidate: true })}
                >
                  <SelectTrigger id="fundingToken">
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(supportedTokens).map((symbol) => {
                      const tokenInfo = TOKEN_INFO[symbol]
                      return (
                        <SelectItem key={symbol} value={symbol}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{symbol}</span>
                            <span className="text-muted-foreground text-sm">- {tokenInfo?.name || symbol}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Expected Responses & Reward Per Response */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expectedResponses">Expected Responses</Label>
                  <Input
                    id="expectedResponses"
                    type="number"
                    min="1"
                    placeholder="10"
                    value={expectedResponses || ""}
                    onChange={(e) => setValue("expectedResponses", parseInt(e.target.value) || 0, { shouldValidate: true })}
                  />
                  <p className="text-xs text-muted-foreground">How many voters do you expect?</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rewardPerResponse">Reward per Response ({fundingToken || "PULSE"})</Label>
                  <Input
                    id="rewardPerResponse"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="1"
                    value={rewardPerResponse || ""}
                    onChange={(e) => setValue("rewardPerResponse", parseFloat(e.target.value) || 0, { shouldValidate: true })}
                  />
                  <p className="text-xs text-muted-foreground">Reward amount per voter</p>
                </div>
              </div>

              {/* Funding Breakdown */}
              {rewardPool > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    Funding Breakdown
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Reward Pool ({expectedResponses} × {rewardPerResponse} {fundingToken})
                      </span>
                      <span className="font-medium">{rewardPool.toFixed(4)} {fundingToken}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Platform Fee ({(platformFeePercent / 100).toFixed(1)}%)
                      </span>
                      <span className="font-medium">{platformFee.toFixed(4)} {fundingToken}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">Total to Fund</span>
                      <span className="font-semibold text-primary">{totalFunding.toFixed(4)} {fundingToken}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Fund Now Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Coins className={cn("h-5 w-5 mt-0.5", fundNow ? "text-primary" : "text-muted-foreground")} />
                  <div className="flex-1">
                    <Label htmlFor="fund-now-toggle" className="font-medium cursor-pointer">
                      {fundNow ? "Fund During Creation" : "Fund Later"}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {fundNow
                        ? "Deposit funds in a single transaction when creating the poll."
                        : "Create the poll first, then add funds separately from the Manage page."}
                    </p>
                  </div>
                </div>
                <Switch
                  id="fund-now-toggle"
                  checked={fundNow}
                  onCheckedChange={(checked) => setValue("fundNow", checked)}
                />
              </div>

              {fundNow && totalFunding > 0 && (
                <div className={cn(
                  "flex items-start gap-2 p-3 rounded-lg border",
                  needsTokenApproval
                    ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                    : "bg-primary/5 border-primary/20"
                )}>
                  <Info className={cn(
                    "h-4 w-4 mt-0.5 shrink-0",
                    needsTokenApproval ? "text-amber-600" : "text-primary"
                  )} />
                  <div className="text-sm">
                    <p className={cn(
                      "font-medium",
                      needsTokenApproval ? "text-amber-800 dark:text-amber-200" : "text-primary"
                    )}>
                      {needsTokenApproval ? "Approval Required" : "Ready to Fund"}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {fundingToken === "ETH" || fundingToken === "MNT"
                        ? `You'll send ${totalFunding.toFixed(4)} ${fundingToken} when creating the poll.`
                        : needsTokenApproval
                          ? `Step 1: Approve the contract to spend your ${fundingToken}. Step 2: Create the poll with ${totalFunding.toFixed(4)} ${fundingToken} funding.`
                          : `Approved! Click "Create & Fund Poll" to create your poll with ${totalFunding.toFixed(4)} ${fundingToken} funding.`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {fundingType === "community" && (
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Community-funded polls receive rewards from the community treasury.
                Donors can contribute to this poll after creation.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publish Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Publish Settings</CardTitle>
          <CardDescription>Choose when to make your poll visible to voters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-start gap-3">
              {publish ? (
                <Send className="h-5 w-5 text-primary mt-0.5" />
              ) : (
                <FileEdit className="h-5 w-5 text-muted-foreground mt-0.5" />
              )}
              <div className="flex-1">
                <Label htmlFor="publish-toggle" className="font-medium cursor-pointer">
                  {publish ? "Publish Immediately" : "Save as Draft"}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {publish
                    ? "Your poll will be active and visible to voters immediately after creation."
                    : "Your poll will be saved as a draft. You can publish it later from the Manage page."}
                </p>
              </div>
            </div>
            <Switch
              id="publish-toggle"
              checked={publish}
              onCheckedChange={(checked) => setValue("publish", checked)}
            />
          </div>

          {!publish && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Draft Mode</p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  Draft polls are only visible to you. The poll timer won&apos;t start until you publish it.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Create New Poll</h1>
        <p className="text-muted-foreground text-lg">
          Create a decentralized poll and let your community make decisions together
        </p>
      </div>

      {/* Stepper */}
      <Stepper
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        className="mb-8"
      />

      <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
        {/* Render current step */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        {/* Contract Status Warnings */}
        {!isConnected && currentStep === 3 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span className="font-medium text-amber-800 dark:text-amber-200">Wallet not connected</span>
            </div>
            <p className="text-amber-700 dark:text-amber-300 mt-1">Please connect your wallet to create a poll on-chain</p>
          </div>
        )}

        {isConnected && !contractAddress && currentStep === 3 && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-800 dark:text-red-200">Contract not available</span>
            </div>
            <p className="text-red-700 dark:text-red-300 mt-1">The polls contract is not deployed on this network</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleBack}
            disabled={currentStep === 1}
            className={currentStep === 1 ? "invisible" : ""}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-4">
            {currentStep < STEPS.length ? (
              <Button type="button" size="lg" onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : needsTokenApproval ? (
              // Show Approve button when ERC20 token approval is needed
              <Button
                type="button"
                size="lg"
                disabled={isSubmitting || !isConnected || !contractAddress}
                onClick={handleApproval}
              >
                {(isApproving || approvalPending) ? "Approving token..." : `Approve ${fundingToken}`}
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                disabled={isSubmitting || !isConnected || !contractAddress}
                onClick={handleSubmit(onSubmit)}
              >
                {isApproving && "Approving token..."}
                {(isPending || isFundingPending) && "Preparing transaction..."}
                {(isConfirming || isFundingConfirming) && "Confirming transaction..."}
                {!isSubmitting && (fundNow && fundingType === "self" && totalFunding > 0 ? "Create & Fund Poll" : "Create Poll")}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
