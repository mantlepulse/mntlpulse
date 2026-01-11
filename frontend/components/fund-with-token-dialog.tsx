"use client"

import { useState, useEffect } from "react"
import { useAccount, useChainId } from "wagmi"
import { Address, formatUnits, parseUnits } from "viem"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Check, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import {
  useFundPollWithToken,
  useFundPollWithETH,
  useTokenApproval,
  useTokenBalance,
  useTokenAllowance,
  usePollsContractAddress,
} from "@/lib/contracts/polls-contract-utils"
import { useBalance } from "wagmi"
import {
  getSupportedTokens,
  getTokenInfo,
} from "@/lib/contracts/token-config"

interface FundWithTokenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pollId: number
  pollTitle: string
  pollFundingToken?: string // The token symbol this poll accepts (ETH, USDC, PULSE)
  onSuccess?: (pollId: number) => void // Callback when funding succeeds with the poll ID
}

export function FundWithTokenDialog({
  open,
  onOpenChange,
  pollId,
  pollTitle,
  pollFundingToken = "ETH", // Default to ETH if not provided
  onSuccess,
}: FundWithTokenDialogProps) {
  const { address } = useAccount()
  const chainId = useChainId()
  const pollsContractAddress = usePollsContractAddress()

  // State - Initialize with poll's designated funding token
  const [selectedToken] = useState<string>(pollFundingToken)
  const [amount, setAmount] = useState<string>("")
  const [step, setStep] = useState<"input" | "approve" | "fund">("input")

  // Get supported tokens for current chain
  const supportedTokens = getSupportedTokens(chainId)
  const selectedTokenAddress = supportedTokens[selectedToken] as Address
  const tokenInfo = getTokenInfo(selectedToken)
  const isETH = selectedToken === "ETH"

  // Hooks
  const { fundPoll: fundPollWithToken, isPending: isFundingToken, isSuccess: isFundSuccessToken } = useFundPollWithToken()
  const { fundPoll: fundPollWithETH, isPending: isFundingETH, isSuccess: isFundSuccessETH } = useFundPollWithETH()
  const { approve, isPending: isApproving, isSuccess: isApproveSuccess } = useTokenApproval()

  // Get ETH balance or token balance
  const { data: ethBalance } = useBalance({ address })
  const { data: tokenBalance } = useTokenBalance(isETH ? undefined : selectedTokenAddress, address)
  const balance = isETH ? ethBalance?.value : tokenBalance

  const { data: allowance, refetch: refetchAllowance } = useTokenAllowance(
    isETH ? undefined : selectedTokenAddress,
    address,
    pollsContractAddress
  )

  const isFunding = isFundingToken || isFundingETH
  const isFundSuccess = isFundSuccessToken || isFundSuccessETH

  // Format balance for display
  const formattedBalance = balance && tokenInfo
    ? formatUnits(balance, tokenInfo.decimals)
    : "0"

  // Check if user has sufficient balance
  const hasInsufficientBalance = () => {
    if (!amount || !balance || !tokenInfo) return false
    try {
      const amountBigInt = parseUnits(amount, tokenInfo.decimals)
      return amountBigInt > balance
    } catch {
      return false
    }
  }

  // Check if approval is needed (ETH doesn't need approval)
  const needsApproval = () => {
    if (isETH) return false // ETH doesn't need approval
    if (!amount || !allowance || !tokenInfo) return true
    try {
      const amountBigInt = parseUnits(amount, tokenInfo.decimals)
      return amountBigInt > allowance
    } catch {
      return true
    }
  }

  // Handle approve
  const handleApprove = async () => {
    if (!selectedTokenAddress || !pollsContractAddress || !tokenInfo || !amount) return

    try {
      setStep("approve")
      await approve(selectedTokenAddress, pollsContractAddress, amount, tokenInfo.decimals)
      toast.success("Token approval initiated!")
    } catch (error: any) {
      console.error("Approval error:", error)
      toast.error(error.message || "Failed to approve token")
      setStep("input")
    }
  }

  // Handle fund
  const handleFund = async () => {
    if (!amount) return

    try {
      setStep("fund")

      if (isETH) {
        // Fund with ETH (no token address needed)
        await fundPollWithETH(pollId, amount)
      } else {
        // Fund with ERC20 token
        if (!selectedTokenAddress || !tokenInfo) return
        await fundPollWithToken(pollId, selectedTokenAddress, amount, tokenInfo.decimals)
      }
      // Success toast is shown in useEffect when isFundSuccess becomes true
    } catch (error: any) {
      console.error("Funding error:", error)
      toast.error(error.message || "Failed to fund poll")
      setStep("input")
    }
  }

  // Handle submit
  const handleSubmit = async () => {
    if (needsApproval()) {
      await handleApprove()
    } else {
      await handleFund()
    }
  }

  // Reset when approval succeeds
  useEffect(() => {
    if (isApproveSuccess && step === "approve") {
      refetchAllowance()
      toast.success("Ready to fund poll!")
      setStep("input")
    }
  }, [isApproveSuccess, step, refetchAllowance])

  // Reset when funding succeeds
  useEffect(() => {
    if (isFundSuccess && step === "fund") {
      toast.success("Poll funded successfully! Refreshing data...")
      setAmount("")
      setStep("input")
      onOpenChange(false)
      // Call onSuccess to trigger refetch - the hook will retry until subgraph updates
      onSuccess?.(pollId)
    }
  }, [isFundSuccess, step, onOpenChange, onSuccess, pollId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Fund Poll with Tokens</DialogTitle>
          <DialogDescription>
            Support "{pollTitle}" with your tokens
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Token Display (read-only) */}
          <div className="space-y-2">
            <Label>Required Token</Label>
            <div className="p-3 border rounded-md bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="font-medium">{selectedToken}</span>
                <span className="text-muted-foreground text-sm">
                  - {tokenInfo?.name || selectedToken}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This poll only accepts {selectedToken} funding
            </p>
            {address && (
              <p className="text-xs text-muted-foreground">
                Your Balance: {parseFloat(formattedBalance).toLocaleString(undefined, {
                  maximumFractionDigits: 6
                })} {selectedToken}
              </p>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="any"
                min="0"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAmount(formattedBalance)}
              >
                Max
              </Button>
            </div>
            {hasInsufficientBalance() && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Insufficient balance
              </p>
            )}
          </div>

          {/* Action Button */}
          <div className="space-y-2">
            {step === "input" && needsApproval() && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                You need to approve {selectedToken} spending first
              </p>
            )}

            <Button
              onClick={handleSubmit}
              disabled={
                !amount ||
                parseFloat(amount) <= 0 ||
                hasInsufficientBalance() ||
                isApproving ||
                isFunding
              }
              className="w-full"
            >
              {(isApproving || isFunding) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isApproving && "Approving..."}
              {isFunding && "Funding..."}
              {!isApproving && !isFunding && needsApproval() && `Approve ${selectedToken}`}
              {!isApproving && !isFunding && !needsApproval() && "Fund Poll"}
            </Button>

            {isApproveSuccess && step === "input" && !needsApproval() && (
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 justify-center">
                <Check className="h-3 w-3" />
                Approval confirmed! Ready to fund.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
