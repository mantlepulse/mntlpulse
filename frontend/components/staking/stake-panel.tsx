"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Coins,
  Lock,
  Unlock,
  Gift,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles
} from "lucide-react"
import { formatEther, parseEther, Address } from "viem"
import { useAccount } from "wagmi"
import { toast } from "sonner"
import {
  useUserStakingStatus,
  useStake,
  useUnstake,
  useClaimStakingRewards,
  useApprovePulseForStaking,
  usePulseAllowanceForStaking,
  useStakingContractAddress,
} from "@/lib/contracts/staking-contract-utils"
import { usePulseTokenAddress } from "@/lib/contracts/premium-contract-utils"

export function StakePanel() {
  const [stakeAmount, setStakeAmount] = useState("")
  const [unstakeAmount, setUnstakeAmount] = useState("")
  const [activeTab, setActiveTab] = useState("stake")

  const { address } = useAccount()
  const stakingContract = useStakingContractAddress()
  const pulseToken = usePulseTokenAddress()

  // Get staking status
  const {
    stakeInfo,
    isPremium,
    claimableRewards,
    pulseBalance,
    minimumStake,
    isLoading
  } = useUserStakingStatus()

  // Get allowance
  const { data: allowance, refetch: refetchAllowance } = usePulseAllowanceForStaking(address)

  // Staking hooks
  const {
    stake,
    isPending: isStaking,
    isConfirming: isStakeConfirming,
    isSuccess: isStakeSuccess,
    error: stakeError
  } = useStake()

  const {
    unstake,
    isPending: isUnstaking,
    isConfirming: isUnstakeConfirming,
    isSuccess: isUnstakeSuccess,
    error: unstakeError
  } = useUnstake()

  const {
    claimRewards,
    isPending: isClaiming,
    isConfirming: isClaimConfirming,
    isSuccess: isClaimSuccess,
    error: claimError
  } = useClaimStakingRewards()

  const {
    approve,
    isPending: isApproving,
    isConfirming: isApproveConfirming,
    isSuccess: isApproveSuccess,
    error: approveError
  } = useApprovePulseForStaking()

  // Calculate values
  const stakedAmount = stakeInfo?.amount || BigInt(0)
  const minimumStakeAmount = minimumStake || BigInt(10000) * BigInt(1e18)
  const progressToMinimum = minimumStakeAmount > BigInt(0)
    ? Number((stakedAmount * BigInt(100)) / minimumStakeAmount)
    : 0

  // Check allowance
  const parsedStakeAmount = stakeAmount ? parseEther(stakeAmount) : BigInt(0)
  const needsApproval = !allowance || allowance < parsedStakeAmount

  // Handle success/errors
  useEffect(() => {
    if (isStakeSuccess) {
      toast.success("Successfully staked PULSE!")
      setStakeAmount("")
    }
  }, [isStakeSuccess])

  useEffect(() => {
    if (isUnstakeSuccess) {
      toast.success("Successfully unstaked PULSE!")
      setUnstakeAmount("")
    }
  }, [isUnstakeSuccess])

  useEffect(() => {
    if (isClaimSuccess) {
      toast.success("Rewards claimed successfully!")
    }
  }, [isClaimSuccess])

  useEffect(() => {
    if (isApproveSuccess) {
      toast.success("PULSE approved for staking!")
      refetchAllowance()
    }
  }, [isApproveSuccess, refetchAllowance])

  useEffect(() => {
    if (stakeError) toast.error(`Stake failed: ${stakeError.message}`)
    if (unstakeError) toast.error(`Unstake failed: ${unstakeError.message}`)
    if (claimError) toast.error(`Claim failed: ${claimError.message}`)
    if (approveError) toast.error(`Approval failed: ${approveError.message}`)
  }, [stakeError, unstakeError, claimError, approveError])

  const handleApprove = async () => {
    if (!stakeAmount) return
    // Approve a generous amount
    const approvalAmount = (parseEther(stakeAmount) * BigInt(10)).toString()
    await approve(formatEther(BigInt(approvalAmount)))
  }

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }
    await stake(stakeAmount)
  }

  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }
    if (parseEther(unstakeAmount) > stakedAmount) {
      toast.error("Cannot unstake more than staked amount")
      return
    }
    await unstake(unstakeAmount)
  }

  const handleClaim = async () => {
    if (!claimableRewards || claimableRewards === BigInt(0)) {
      toast.error("No rewards to claim")
      return
    }
    await claimRewards()
  }

  const setMaxStake = () => {
    if (pulseBalance) {
      setStakeAmount(formatEther(pulseBalance))
    }
  }

  const setMaxUnstake = () => {
    if (stakedAmount) {
      setUnstakeAmount(formatEther(stakedAmount))
    }
  }

  const isProcessing = isStaking || isStakeConfirming || isUnstaking || isUnstakeConfirming ||
    isClaiming || isClaimConfirming || isApproving || isApproveConfirming

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Stake PULSE
        </CardTitle>
        <CardDescription>
          Stake PULSE tokens to unlock premium features and earn rewards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Premium Status */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Premium Status</p>
            {isPremium ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Premium Active
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  <Lock className="h-3 w-3 mr-1" />
                  Not Premium
                </Badge>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Staked</p>
            <p className="text-xl font-bold">
              {Number(formatEther(stakedAmount)).toLocaleString(undefined, { maximumFractionDigits: 2 })} PULSE
            </p>
          </div>
        </div>

        {/* Progress to Premium */}
        {!isPremium && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress to Premium</span>
              <span className="font-medium">{Math.min(100, progressToMinimum)}%</span>
            </div>
            <Progress value={Math.min(100, progressToMinimum)} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Stake {Number(formatEther(minimumStakeAmount)).toLocaleString()} PULSE to unlock premium
            </p>
          </div>
        )}

        {/* Rewards Section */}
        {claimableRewards && claimableRewards > BigInt(0) && (
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Claimable Rewards</p>
                <p className="text-lg font-bold text-green-600">
                  {Number(formatEther(claimableRewards)).toLocaleString(undefined, { maximumFractionDigits: 4 })} PULSE
                </p>
              </div>
            </div>
            <Button
              onClick={handleClaim}
              disabled={isProcessing}
              variant="default"
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              {isClaiming || isClaimConfirming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Claim"
              )}
            </Button>
          </div>
        )}

        {/* Stake/Unstake Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stake">
              <Lock className="h-4 w-4 mr-2" />
              Stake
            </TabsTrigger>
            <TabsTrigger value="unstake">
              <Unlock className="h-4 w-4 mr-2" />
              Unstake
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stake" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Amount to Stake</Label>
                <span className="text-sm text-muted-foreground">
                  Balance: {pulseBalance ? Number(formatEther(pulseBalance)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"} PULSE
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={setMaxStake}>
                  MAX
                </Button>
              </div>
            </div>

            {needsApproval && stakeAmount && parseFloat(stakeAmount) > 0 ? (
              <Button
                onClick={handleApprove}
                disabled={isProcessing}
                className="w-full"
              >
                {isApproving || isApproveConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve PULSE
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleStake}
                disabled={isProcessing || !stakeAmount || parseFloat(stakeAmount) <= 0}
                className="w-full"
              >
                {isStaking || isStakeConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Staking...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Stake PULSE
                  </>
                )}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="unstake" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Amount to Unstake</Label>
                <span className="text-sm text-muted-foreground">
                  Staked: {Number(formatEther(stakedAmount)).toLocaleString(undefined, { maximumFractionDigits: 2 })} PULSE
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={setMaxUnstake}>
                  MAX
                </Button>
              </div>
            </div>

            {isPremium && unstakeAmount && parseEther(unstakeAmount) >= stakedAmount && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Unstaking all tokens will remove your premium status
                </p>
              </div>
            )}

            <Button
              onClick={handleUnstake}
              disabled={isProcessing || !unstakeAmount || parseFloat(unstakeAmount) <= 0 || stakedAmount === BigInt(0)}
              className="w-full"
              variant="outline"
            >
              {isUnstaking || isUnstakeConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Unstaking...
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unstake PULSE
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
