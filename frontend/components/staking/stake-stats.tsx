"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Coins,
  TrendingUp,
  Users,
  Percent,
  Clock,
  Award
} from "lucide-react"
import { formatEther } from "viem"
import { useAccount } from "wagmi"
import {
  useUserStakingStatus,
  useTotalStaked,
  useRewardRatePerSecond,
  useRewardPool,
  calculateAPY,
} from "@/lib/contracts/staking-contract-utils"

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  isLoading?: boolean
}

function StatCard({ icon, label, value, subValue, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
            {subValue && !isLoading && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StakeStats() {
  const { address } = useAccount()

  // User staking status
  const {
    stakeInfo,
    isPremium,
    claimableRewards,
    minimumStake,
    isLoading: isUserLoading
  } = useUserStakingStatus()

  // Global staking stats
  const { data: totalStaked, isLoading: isTotalLoading } = useTotalStaked()
  const { data: rewardRate, isLoading: isRateLoading } = useRewardRatePerSecond()
  const { data: rewardPool, isLoading: isPoolLoading } = useRewardPool()

  // Calculate APY
  const apy = rewardRate && totalStaked && (totalStaked as bigint) > BigInt(0)
    ? calculateAPY(rewardRate as bigint, totalStaked as bigint)
    : 0

  // Format values
  const stakedAmount = stakeInfo?.amount || BigInt(0)
  const stakingDays = stakeInfo?.stakingStartTime
    ? Math.floor((Date.now() / 1000 - Number(stakeInfo.stakingStartTime)) / 86400)
    : 0

  return (
    <div className="space-y-6">
      {/* User Stats Section */}
      {address && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Your Staking</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Coins className="h-5 w-5 text-primary" />}
              label="Your Stake"
              value={`${Number(formatEther(stakedAmount)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              subValue="PULSE"
              isLoading={isUserLoading}
            />
            <StatCard
              icon={<Award className="h-5 w-5 text-primary" />}
              label="Claimable Rewards"
              value={`${claimableRewards ? Number(formatEther(claimableRewards)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : "0"}`}
              subValue="PULSE"
              isLoading={isUserLoading}
            />
            <StatCard
              icon={<Clock className="h-5 w-5 text-primary" />}
              label="Staking Duration"
              value={stakingDays > 0 ? `${stakingDays}` : "0"}
              subValue={stakingDays === 1 ? "day" : "days"}
              isLoading={isUserLoading}
            />
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Premium Status</p>
                    {isUserLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <div className="flex items-center gap-2 mt-2">
                        {isPremium ? (
                          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    )}
                    {!isUserLoading && !isPremium && minimumStake && (
                      <p className="text-xs text-muted-foreground">
                        Need {Number(formatEther(minimumStake - stakedAmount)).toLocaleString()} more
                      </p>
                    )}
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Global Stats Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Protocol Stats</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Coins className="h-5 w-5 text-primary" />}
            label="Total Staked"
            value={totalStaked ? Number(formatEther(totalStaked as bigint)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}
            subValue="PULSE"
            isLoading={isTotalLoading}
          />
          <StatCard
            icon={<Percent className="h-5 w-5 text-primary" />}
            label="Estimated APY"
            value={`${apy.toFixed(2)}%`}
            subValue="Annual yield"
            isLoading={isRateLoading || isTotalLoading}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-primary" />}
            label="Reward Pool"
            value={rewardPool ? Number(formatEther(rewardPool as bigint)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}
            subValue="PULSE available"
            isLoading={isPoolLoading}
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-primary" />}
            label="Reward Rate"
            value={rewardRate ? Number(formatEther(rewardRate as bigint)).toFixed(6) : "0"}
            subValue="PULSE per second"
            isLoading={isRateLoading}
          />
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Staking Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-primary/10 rounded">
              <Coins className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Stake PULSE Tokens</p>
              <p>Lock your PULSE tokens to start earning rewards and unlock premium features.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-primary/10 rounded">
              <Award className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Earn Rewards</p>
              <p>Accumulate PULSE rewards based on the global reward rate and your stake percentage.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-primary/10 rounded">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Unlock Premium</p>
              <p>Stake {minimumStake ? Number(formatEther(minimumStake)).toLocaleString() : "10,000"} PULSE or more to unlock premium features like Quadratic Voting.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
