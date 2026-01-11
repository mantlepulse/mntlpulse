/**
 * Batch Distribute Wizard Component
 * Multi-step wizard for distributing rewards to multiple responders
 */

"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Stepper } from "@/components/ui/stepper"
import { toast } from "sonner"
import { Loader2, AlertCircle, CheckCircle2, Info } from "lucide-react"
import { formatEther, parseEther } from "viem"
import { useSubgraphPollVoters } from "@/hooks/subgraph/use-subgraph-poll-voters"
import { usePollTokenBalancesFromFundings } from "@/hooks/use-poll-token-balances"

interface Distribution {
  recipient: string
  amount: string
}

interface BatchDistributeWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pollId: bigint
  pollTitle: string
  onDistribute: (
    pollId: bigint,
    token: string,
    recipients: string[],
    amounts: string[]
  ) => Promise<void>
  isPending?: boolean
}

type DistributionMethod = "equal" | "weighted" | "custom"

const STEPS = [
  { title: "Token", description: "Select token" },
  { title: "Method", description: "Distribution method" },
  { title: "Review", description: "Review & adjust" },
  { title: "Execute", description: "Confirm distribution" },
]

export function BatchDistributeWizard({
  open,
  onOpenChange,
  pollId,
  pollTitle,
  onDistribute,
  isPending = false,
}: BatchDistributeWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedToken, setSelectedToken] = useState<string>("")
  const [method, setMethod] = useState<DistributionMethod>("equal")
  const [distributions, setDistributions] = useState<Distribution[]>([])

  // Fetch voters and balances on-demand
  const { voters, voterCount, loading: votersLoading, error: votersError } =
    useSubgraphPollVoters(pollId.toString())

  const { balances, isLoading: balancesLoading, hasError: balancesError } =
    usePollTokenBalancesFromFundings(Number(pollId))

  const isLoadingData = votersLoading || balancesLoading
  const hasDataError = votersError || balancesError

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1)
      setSelectedToken("")
      setMethod("equal")
      setDistributions([])
    }
  }, [open])

  // Initialize selected token when balances load
  useEffect(() => {
    if (balances.length > 0 && !selectedToken && currentStep === 1) {
      setSelectedToken(balances[0].token)
    }
  }, [balances, selectedToken, currentStep])

  // Calculate distributions
  const calculateDistributions = useMemo(() => {
    if (!selectedToken || voters.length === 0) return []

    const selectedBalance = balances.find((b) => b.token === selectedToken)
    if (!selectedBalance) return []

    const totalBalance = selectedBalance.balance

    if (method === "equal") {
      const amountPerVoter = totalBalance / BigInt(voters.length)
      return voters.map((voter) => ({
        recipient: voter.address,
        amount: formatEther(amountPerVoter),
      }))
    }

    if (method === "weighted") {
      // TODO: Implement actual weighted distribution
      // For now, equal distribution
      const amountPerVoter = totalBalance / BigInt(voters.length)
      return voters.map((voter) => ({
        recipient: voter.address,
        amount: formatEther(amountPerVoter),
      }))
    }

    return distributions
  }, [selectedToken, method, voters, balances, distributions])

  // Update distributions when method or selection changes
  useEffect(() => {
    if (method !== "custom" && currentStep >= 2) {
      setDistributions(calculateDistributions)
    } else if (method === "custom" && distributions.length === 0) {
      // Initialize custom mode with equal distribution
      setDistributions(calculateDistributions)
    }
  }, [method, calculateDistributions, currentStep])

  const selectedBalance = balances.find((b) => b.token === selectedToken)
  const totalDistribution = distributions.reduce(
    (sum, d) => sum + parseEther(d.amount || "0"),
    BigInt(0)
  )

  // Validation for each step
  const canProceedFromStep1 = selectedToken && balances.length > 0 && voters.length > 0
  const canProceedFromStep2 = method && distributions.length > 0
  const canProceedFromStep3 =
    distributions.length > 0 &&
    selectedBalance &&
    totalDistribution <= selectedBalance.balance &&
    totalDistribution > BigInt(0)

  const handleCustomAmountChange = (recipient: string, amount: string) => {
    setDistributions((prev) =>
      prev.map((d) => (d.recipient === recipient ? { ...d, amount } : d))
    )
  }

  const handleSetAllAmounts = () => {
    if (!selectedBalance || voters.length === 0) return

    const amountPerVoter = selectedBalance.balance / BigInt(voters.length)
    const formattedAmount = formatEther(amountPerVoter)

    setDistributions((prev) =>
      prev.map((d) => ({ ...d, amount: formattedAmount }))
    )
  }

  const handleResetAmounts = () => {
    setDistributions(calculateDistributions)
  }

  const handleDistribute = async () => {
    if (!selectedToken || distributions.length === 0) {
      toast.error("Invalid distribution configuration")
      return
    }

    try {
      const recipients = distributions.map((d) => d.recipient)
      const amounts = distributions.map((d) => parseEther(d.amount).toString())

      await onDistribute(pollId, selectedToken, recipients, amounts)

      setCurrentStep(4)
      toast.success("Distribution transaction submitted successfully!")

      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false)
      }, 2000)
    } catch (error) {
      console.error("Distribution failed:", error)
      toast.error("Failed to distribute rewards. Please try again.")
    }
  }

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    } else if (currentStep === 3) {
      handleDistribute()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Gas estimation (static for now)
  const estimatedGas = voters.length > 0 ? 50000 + voters.length * 25000 : 0
  const estimatedGasCost = formatEther(BigInt(estimatedGas) * BigInt(20) * BigInt(1e9)) // Assume 20 gwei

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Distribute Rewards</DialogTitle>
          <DialogDescription>
            Distribute rewards to all responders of "{pollTitle}"
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <Stepper
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={(step) => {
            // Allow going back to previous steps
            if (step < currentStep) {
              setCurrentStep(step)
            }
          }}
        />

        {/* Loading State */}
        {isLoadingData && currentStep === 1 && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Loading poll data...
            </p>
          </div>
        )}

        {/* Error State */}
        {hasDataError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                Failed to load poll data
              </p>
              <p className="text-xs text-destructive/80">
                {votersError ? "Could not fetch voters. " : ""}
                {balancesError ? "Could not fetch token balances." : ""}
              </p>
            </div>
          </div>
        )}

        {/* Step Content */}
        {!isLoadingData && !hasDataError && (
          <div className="space-y-4 py-4">
            {/* Step 1: Token Selection */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Token to Distribute</Label>
                  {balances.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        No funds available to distribute in this poll
                      </p>
                    </div>
                  ) : (
                    <Select value={selectedToken} onValueChange={setSelectedToken}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a token" />
                      </SelectTrigger>
                      <SelectContent>
                        {balances.map((balance) => (
                          <SelectItem key={balance.token} value={balance.token}>
                            {balance.symbol} - {formatEther(balance.balance)} available
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Voters Info */}
                <div className="rounded-lg border bg-muted p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Voters:</span>
                    <span className="font-medium">{voterCount}</span>
                  </div>
                  {selectedBalance && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Available Balance:</span>
                        <span className="font-medium">
                          {formatEther(selectedBalance.balance)} {selectedBalance.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Per Voter (Equal):</span>
                        <span className="font-medium">
                          {voterCount > 0
                            ? formatEther(selectedBalance.balance / BigInt(voterCount))
                            : "0"}{" "}
                          {selectedBalance.symbol}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {voters.length === 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      No voters found for this poll. Rewards cannot be distributed.
                    </p>
                  </div>
                )}

                {voters.length > 50 && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Large recipient list ({voters.length} voters)
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Distributing to many recipients will require higher gas fees. Estimated: ~{estimatedGasCost} ETH
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Distribution Method */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Select Distribution Method</Label>
                  <RadioGroup value={method} onValueChange={(v) => setMethod(v as DistributionMethod)}>
                    <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent">
                      <RadioGroupItem value="equal" id="equal" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="equal" className="cursor-pointer font-medium">
                          Equal Distribution
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Distribute rewards equally to all {voterCount} voters
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent opacity-60">
                      <RadioGroupItem value="weighted" id="weighted" disabled className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="weighted" className="cursor-not-allowed font-medium">
                          Weighted Distribution
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Coming soon: Weight by voting power or custom criteria
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent">
                      <RadioGroupItem value="custom" id="custom" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="custom" className="cursor-pointer font-medium">
                          Custom Amounts
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Manually set distribution amount for each recipient
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {selectedBalance && (
                  <div className="rounded-lg border bg-muted p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Distribution Preview:</span>
                      <span className="font-medium">
                        {voterCount} recipients × {method === "equal" ? formatEther(selectedBalance.balance / BigInt(voterCount)) : "varies"} {selectedBalance.symbol}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review & Adjust */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Distribution Preview ({distributions.length} recipients)</Label>
                  {method === "custom" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSetAllAmounts}
                      >
                        Set All Equal
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResetAmounts}
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                </div>

                <div className="rounded-md border max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient</TableHead>
                        <TableHead className="text-right">
                          Amount ({selectedBalance?.symbol})
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distributions.slice(0, 100).map((dist, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">
                            {dist.recipient.slice(0, 6)}...{dist.recipient.slice(-4)}
                          </TableCell>
                          <TableCell className="text-right">
                            {method === "custom" ? (
                              <Input
                                type="number"
                                step="0.000001"
                                value={dist.amount}
                                onChange={(e) =>
                                  handleCustomAmountChange(dist.recipient, e.target.value)
                                }
                                className="w-32 ml-auto"
                              />
                            ) : (
                              <span>{parseFloat(dist.amount).toFixed(6)}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {distributions.length > 100 && (
                  <p className="text-xs text-muted-foreground">
                    Showing first 100 of {distributions.length} recipients
                  </p>
                )}

                {/* Summary */}
                {selectedBalance && (
                  <div className="rounded-lg border bg-muted p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Distribution:</span>
                      <span className="font-medium">
                        {formatEther(totalDistribution)} {selectedBalance.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Available Balance:</span>
                      <span className="font-medium">
                        {formatEther(selectedBalance.balance)} {selectedBalance.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Remaining:</span>
                      <span
                        className={
                          selectedBalance.balance - totalDistribution < BigInt(0)
                            ? "font-medium text-destructive"
                            : "font-medium text-green-600 dark:text-green-400"
                        }
                      >
                        {formatEther(selectedBalance.balance - totalDistribution)}{" "}
                        {selectedBalance.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Estimated Gas Cost:</span>
                      <span className="font-medium text-xs">
                        ~{estimatedGasCost} ETH
                      </span>
                    </div>
                  </div>
                )}

                {totalDistribution > (selectedBalance?.balance || BigInt(0)) && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-4">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <p className="text-sm text-destructive">
                      Total distribution exceeds available balance. Please adjust amounts.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Success */}
            {currentStep === 4 && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
                <h3 className="text-lg font-semibold">Distribution Successful!</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Rewards have been distributed to {distributions.length} recipients.
                  Transaction is being processed on the blockchain.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {currentStep < 4 && !isLoadingData && !hasDataError && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                setDistributions([])
                setMethod("equal")
                setCurrentStep(1)
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isPending}
              >
                Back
              </Button>
            )}
            {currentStep < 3 && (
              <Button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !canProceedFromStep1) ||
                  (currentStep === 2 && !canProceedFromStep2)
                }
              >
                Next
              </Button>
            )}
            {currentStep === 3 && (
              <Button
                onClick={handleNext}
                disabled={isPending || !canProceedFromStep3}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Distribute Rewards"
                )}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
