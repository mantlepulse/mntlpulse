"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAccount, useChainId, useBalance } from "wagmi"
import { Address, formatUnits, parseUnits } from "viem"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Coins, Loader2, Check, AlertCircle, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import {
  usePoll,
  useFundPollWithToken,
  useFundPollWithETH,
  useTokenApproval,
  useTokenBalance,
  useTokenAllowance,
  usePollsContractAddress,
} from "@/lib/contracts/polls-contract-utils"
import {
  getSupportedTokens,
  getTokenInfo,
  getTokenSymbol,
} from "@/lib/contracts/token-config"
import Link from "next/link"

interface PageProps {
  params: { id: string }
}

export default function FundPollPage({ params }: PageProps) {
  const router = useRouter()
  const pollId = parseInt(params.id)
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const pollsContractAddress = usePollsContractAddress()

  const [amount, setAmount] = useState<string>("")
  const [step, setStep] = useState<"input" | "approve" | "fund">("input")
  const [fundingComplete, setFundingComplete] = useState(false)

  // Fetch poll data
  const { data: pollData, isLoading: isPollLoading, error: pollError } = usePoll(pollId)

  // Parse poll data
  const pollQuestion = pollData ? (pollData as any)[1] : ""
  const fundingToken = pollData ? (pollData as any)[9] : undefined

  // Get token info
  const fundingTokenSymbol = chainId && fundingToken ? getTokenSymbol(chainId, fundingToken) || 'ETH' : 'ETH'
  const supportedTokens = getSupportedTokens(chainId)
  const selectedTokenAddress = supportedTokens[fundingTokenSymbol] as Address
  const tokenInfo = getTokenInfo(fundingTokenSymbol)
  const isETH = fundingTokenSymbol === "ETH"

  // Funding hooks
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
    if (isETH) return false
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
        await fundPollWithETH(pollId, amount)
      } else {
        if (!selectedTokenAddress || !tokenInfo) return
        await fundPollWithToken(pollId, selectedTokenAddress, amount, tokenInfo.decimals)
      }
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

  // Handle funding success
  useEffect(() => {
    if (isFundSuccess && step === "fund") {
      toast.success("Poll funded successfully!")
      setFundingComplete(true)
      setStep("input")
    }
  }, [isFundSuccess, step])

  if (isPollLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading poll...</p>
          </div>
        </div>
      </div>
    )
  }

  if (pollError || !pollData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Poll Not Found</h2>
          <p className="text-muted-foreground mb-4">This poll doesn't exist or failed to load.</p>
          <Button onClick={() => router.push('/dapp')}>Back to Polls</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/dapp/poll/${pollId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Poll
        </Button>

        <div className="flex items-center gap-2 mb-2">
          <Coins className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Fund Poll</h1>
        </div>
        <p className="text-muted-foreground">
          Add rewards to incentivize participation
        </p>
      </div>

      {/* Funding Complete Card */}
      {fundingComplete && (
        <Card className="mb-6 border-green-500/30 bg-green-500/10">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-green-600">Funding Complete!</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Your contribution has been added to the poll rewards.
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href={`/dapp/poll/${pollId}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Poll
                  </Link>
                </Button>
                <Button onClick={() => setFundingComplete(false)}>
                  Fund More
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Funding Card */}
      {!fundingComplete && (
        <Card>
          <CardHeader>
            <CardTitle>Fund "{pollQuestion}"</CardTitle>
            <CardDescription>
              Support this poll by adding {fundingTokenSymbol} rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wallet Connection Warning */}
            {!isConnected && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please connect your wallet to fund this poll.
                </AlertDescription>
              </Alert>
            )}

            {/* Token Info */}
            <div className="space-y-2">
              <Label>Funding Token</Label>
              <div className="p-3 border rounded-md bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{fundingTokenSymbol}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {tokenInfo?.name || fundingTokenSymbol}
                    </span>
                  </div>
                  {isConnected && (
                    <span className="text-sm text-muted-foreground">
                      Balance: {parseFloat(formattedBalance).toLocaleString(undefined, {
                        maximumFractionDigits: 6
                      })} {fundingTokenSymbol}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount to Fund</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="any"
                  min="0"
                  disabled={!isConnected}
                />
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setAmount(formattedBalance)}
                  disabled={!isConnected}
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

            {/* Approval Notice */}
            {isConnected && step === "input" && needsApproval() && amount && parseFloat(amount) > 0 && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-300">
                  You need to approve {fundingTokenSymbol} spending first. This is a one-time approval.
                </AlertDescription>
              </Alert>
            )}

            {/* Approval Success */}
            {isApproveSuccess && step === "input" && !needsApproval() && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  Approval confirmed! You can now fund the poll.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Button */}
            <Button
              onClick={handleSubmit}
              disabled={
                !isConnected ||
                !amount ||
                parseFloat(amount) <= 0 ||
                hasInsufficientBalance() ||
                isApproving ||
                isFunding
              }
              className="w-full"
              size="lg"
            >
              {(isApproving || isFunding) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isApproving && "Approving..."}
              {isFunding && "Funding..."}
              {!isApproving && !isFunding && needsApproval() && `Approve ${fundingTokenSymbol}`}
              {!isApproving && !isFunding && !needsApproval() && `Fund ${amount || "0"} ${fundingTokenSymbol}`}
            </Button>

            {/* Info */}
            <p className="text-xs text-muted-foreground text-center">
              Funds will be distributed to poll participants as rewards.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
