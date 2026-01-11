"use client"

import { useState, useEffect } from "react"
import { useAccount, useChainId, useBalance } from "wagmi"
import { formatEther, formatUnits } from "viem"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { SubscriptionTiers } from "@/components/premium/subscription-tiers"
import { PremiumBadge } from "@/components/premium/premium-badge"
import { PremiumShiftDialog } from "@/components/sideshift/premium-shift-dialog"
import { Play } from "lucide-react"
import {
  useIsPremiumOrStaked,
  usePulseBalance,
  useAllTierPrices,
} from "@/lib/contracts/premium-contract-utils"
import { useBuyWithUSDC, useApproveUSDC } from "@/lib/contracts/direct-sale-utils"
import { DIRECT_SALE_CONFIG, getUSDCAddress } from "@/lib/contracts/direct-sale-config"
import { SubscriptionTier } from "@/lib/contracts/premium-contract"
import {
  Crown,
  ArrowLeft,
  Wallet,
  AlertCircle,
  ArrowRightLeft,
  Coins,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function UpgradePage() {
  const [showShiftDialog, setShowShiftDialog] = useState(false)
  const [purchaseAmount, setPurchaseAmount] = useState("")
  const [needsApproval, setNeedsApproval] = useState(true)

  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { data: isPremiumData, isLoading: isPremiumLoading, refetch: refetchPremium } = useIsPremiumOrStaked(address)
  const isPremium = isPremiumData as boolean | undefined
  const { data: pulseBalance, isLoading: pulseLoading, refetch: refetchPulseBalance } = usePulseBalance(address)

  // Get USDC balance instead of ETH
  const usdcAddress = chainId ? getUSDCAddress(chainId) : undefined
  const { data: usdcBalance, isLoading: usdcLoading, refetch: refetchUsdcBalance } = useBalance({
    address,
    token: usdcAddress as `0x${string}` | undefined,
  })

  const tierPrices = useAllTierPrices()

  // DirectTokenSale hooks for buying PULSE
  const { buyWithUSDC, isPending: isBuying, isConfirming: isBuyConfirming, isSuccess: isBuySuccess } = useBuyWithUSDC()
  const { approveUSDC, isPending: isApproving, isConfirming: isApproveConfirming, isSuccess: isApproveSuccess } = useApproveUSDC()

  // Check if on testnet (Base Sepolia)
  const isTestnet = chainId === 84532

  // Get minimum tier price (monthly) to check if user has enough PULSE
  const monthlyPrice = tierPrices[SubscriptionTier.MONTHLY]
  const hasSufficientPulse = pulseBalance && monthlyPrice && pulseBalance >= monthlyPrice

  // Format balances for display
  const formattedPulseBalance = pulseBalance
    ? Number(formatEther(pulseBalance)).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "0"
  const formattedUsdcBalance = usdcBalance
    ? Number(formatUnits(usdcBalance.value, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "0"

  const isLoadingBalances = pulseLoading || usdcLoading

  // Show success toast only after approval is confirmed
  useEffect(() => {
    if (isApproveSuccess) {
      toast.success("USDC approved! Click Buy PULSE again to purchase.")
      setNeedsApproval(false)
    }
  }, [isApproveSuccess])

  // Show success toast and refresh only after purchase is confirmed
  useEffect(() => {
    if (isBuySuccess) {
      toast.success("PULSE purchased successfully!")
      // Refetch balances instead of reloading
      refetchPulseBalance()
      refetchUsdcBalance()
      refetchPremium()
      // Reset approval state for next purchase
      setNeedsApproval(true)
      setPurchaseAmount("")
    }
  }, [isBuySuccess, refetchPulseBalance, refetchUsdcBalance, refetchPremium])

  // Handle buying PULSE with USDC
  const handleBuyPulse = async () => {
    if (!purchaseAmount || parseFloat(purchaseAmount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    try {
      if (needsApproval) {
        // First approve USDC spending
        await approveUSDC(purchaseAmount)
      } else {
        // Then buy PULSE
        await buyWithUSDC(purchaseAmount)
      }
    } catch (error) {
      // Only show error if user rejects or transaction fails
      if (error instanceof Error && !error.message.includes("User rejected")) {
        toast.error("Transaction failed")
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dapp">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Upgrade to Premium</h1>
            {isConnected && <PremiumBadge />}
          </div>
          <p className="text-muted-foreground mt-1">
            Unlock exclusive features with a PULSE subscription
          </p>
        </div>
      </div>

      {/* Demo Video Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            How to Upgrade to Premium
          </CardTitle>
          <CardDescription>
            Watch this quick tutorial to learn how to upgrade your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted">
            <iframe
              className="absolute inset-0 w-full h-full"
              src="https://www.youtube.com/embed/rZhJC19YwYg"
              title="How to Upgrade to Premium"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </CardContent>
      </Card>

      {/* Connect Wallet Prompt */}
      {!isConnected && (
        <Card className="mb-8 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-amber-600" />
              <div>
                <p className="font-medium">Connect your wallet to get started</p>
                <p className="text-sm text-muted-foreground">
                  You need to connect your wallet to subscribe
                </p>
              </div>
            </div>
            <ConnectWalletButton />
          </CardContent>
        </Card>
      )}

      {/* Already Premium Message */}
      {isConnected && isPremium && (
        <Card className="mb-8 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
          <CardContent className="flex items-center gap-3 py-6">
            <Crown className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">You're already a Premium member!</p>
              <p className="text-sm text-green-700 dark:text-green-300">
                You have access to all premium features.{" "}
                <Link href="/premium" className="underline hover:no-underline">
                  Manage subscription
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Testnet Warning */}
      {isConnected && isTestnet && (
        <Alert className="mb-6 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <strong>Testnet Mode:</strong> SideShift bridging is not available on Base Sepolia testnet.
            Please switch to Base Mainnet to use the bridge feature, or obtain testnet PULSE tokens from a faucet.
          </AlertDescription>
        </Alert>
      )}

      {isConnected && !isPremium && (
        <>
          {/* Balance Display */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Your Balances
              </CardTitle>
              <CardDescription>
                Your current token balances on {isTestnet ? "Base Sepolia" : "Base"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PULSE Balance */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Coins className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">PULSE</p>
                      <p className="text-lg font-semibold">
                        {isLoadingBalances ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          formattedPulseBalance
                        )}
                      </p>
                    </div>
                  </div>
                  {hasSufficientPulse && (
                    <Badge className="bg-green-500">Ready to subscribe</Badge>
                  )}
                </div>

                {/* USDC Balance */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-full">
                      <Coins className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">USDC</p>
                      <p className="text-lg font-semibold">
                        {isLoadingBalances ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          formattedUsdcBalance
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Buy PULSE Section - Show on both mainnet and testnet */}
              {!hasSufficientPulse && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Coins className="h-5 w-5" />
                      Buy PULSE
                    </CardTitle>
                    <CardDescription>
                      Purchase PULSE tokens with your USDC at a fixed price of {DIRECT_SALE_CONFIG.tokenPrice} USDC per PULSE
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Amount in USDC"
                          value={purchaseAmount}
                          onChange={(e) => setPurchaseAmount(e.target.value)}
                          disabled={isApproving || isApproveConfirming || isBuying || isBuyConfirming}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleBuyPulse}
                          disabled={isApproving || isApproveConfirming || isBuying || isBuyConfirming || !purchaseAmount}
                          className="min-w-[140px]"
                        >
                          {(isApproving || isApproveConfirming || isBuying || isBuyConfirming) && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          {needsApproval ? "Approve USDC" : "Buy PULSE"}
                        </Button>
                      </div>

                      {/* Transaction status */}
                      {(isApproving || isBuying) && (
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Please confirm the transaction in your wallet...
                        </p>
                      )}
                      {(isApproveConfirming || isBuyConfirming) && (
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          <Loader2 className="h-3 w-3 inline mr-1 animate-spin" />
                          Transaction confirming on-chain...
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        You will receive approximately {purchaseAmount ? (parseFloat(purchaseAmount) / parseFloat(DIRECT_SALE_CONFIG.tokenPrice)).toFixed(2) : "0"} PULSE tokens
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Shift Crypto to USDC Section - Only show on mainnet */}
              {!isTestnet && !hasSufficientPulse && (
                <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-dashed">
                  <div className="flex items-start gap-3">
                    <ArrowRightLeft className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">Don't have USDC?</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Shift any cryptocurrency from any network to Base USDC using SideShift.
                      </p>
                      <Button
                        className="mt-3"
                        onClick={() => setShowShiftDialog(true)}
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Shift Crypto to Base
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Testnet notice for insufficient balance */}
              {isTestnet && !hasSufficientPulse && (
                <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-dashed">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">Need testnet PULSE?</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Bridging is not available on testnet. To test premium features, please obtain testnet PULSE tokens from a faucet or switch to Base Mainnet.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription Tiers */}
          <SubscriptionTiers />
        </>
      )}

      {/* Premium Shift Dialog */}
      <PremiumShiftDialog
        open={showShiftDialog}
        onOpenChange={setShowShiftDialog}
        onSuccess={() => {
          // Refetch USDC balance after successful shift
          refetchUsdcBalance()
        }}
      />
    </div>
  )
}
