"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Coins, TrendingUp, Users, ShoppingCart, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useAccount, useChainId, useBalance } from "wagmi"
import { formatEther, formatUnits, parseUnits } from "viem"
import {
  useSaleStats,
  useRemainingAllowance,
  usePurchasedAmount,
  useBuyWithETH,
  useBuyWithUSDC,
  useApproveUSDC,
  useCalculateTokensForETH,
  useCalculateTokensForUSDC,
  useCalculateETHCost,
  useCalculateUSDCCost,
  useIsSaleActive,
  formatTokenAmount,
  formatUSDCAmount,
  formatETHAmount,
  useDirectSaleAddress,
} from "@/lib/contracts/direct-sale-utils"
import { DIRECT_SALE_CONFIG, getUSDCAddress } from "@/lib/contracts/direct-sale-config"
import { useReadContract } from "wagmi"
import { useETHPrice, formatETHToPulseRate } from "@/hooks/use-eth-price"

export default function BuyPulsePage() {
  const [paymentMethod, setPaymentMethod] = useState<"eth" | "usdc">("usdc")
  const [tokenAmount, setTokenAmount] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [inputMode, setInputMode] = useState<"payment" | "token">("payment") // Track which field user is editing
  const [needsApproval, setNeedsApproval] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const contractAddress = useDirectSaleAddress()

  // Fetch current ETH price for dynamic rate display
  const { price: ethPriceUSD, loading: ethPriceLoading } = useETHPrice()

  // Wallet balances
  const { data: ethBalance, isLoading: ethBalanceLoading } = useBalance({ address })
  const usdcAddress = getUSDCAddress(chainId)
  const { data: usdcBalanceData, isLoading: usdcBalanceLoading } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ] as const,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!usdcAddress },
  })
  const usdcBalance = usdcBalanceData as bigint | undefined

  // USDC allowance for DirectTokenSale contract
  const { data: usdcAllowanceData, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: [
      {
        name: "allowance",
        type: "function",
        stateMutability: "view",
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
      },
    ] as const,
    functionName: "allowance",
    args: address && contractAddress ? [address, contractAddress as `0x${string}`] : undefined,
    query: { enabled: !!address && !!usdcAddress && !!contractAddress },
  })
  const usdcAllowance = usdcAllowanceData as bigint | undefined

  // Contract read hooks
  const { data: saleStats, refetch: refetchSaleStats } = useSaleStats()
  const { data: isSaleActive } = useIsSaleActive()
  const { data: remainingAllowance, refetch: refetchRemainingAllowance } = useRemainingAllowance(address)
  const { data: purchasedAmount, refetch: refetchPurchasedAmount } = usePurchasedAmount(address)

  // Write hooks
  const { buyWithETH, isPending: isBuyingETH, isConfirming: isConfirmingETH, isSuccess: isSuccessETH, error: errorETH } = useBuyWithETH()
  const { buyWithUSDC, isPending: isBuyingUSDC, isConfirming: isConfirmingUSDC, isSuccess: isSuccessUSDC, error: errorUSDC } = useBuyWithUSDC()
  const { approveUSDC, isPending: isApproving, isConfirming: isConfirmingApproval, isSuccess: isSuccessApproval } = useApproveUSDC()

  // Calculation hooks - always calculate based on current values
  // Calculate tokens for payment amount (payment → tokens)
  const { data: tokensForETH } = useCalculateTokensForETH(paymentMethod === "eth" && inputMode === "payment" ? paymentAmount : "0")
  const { data: tokensForUSDC } = useCalculateTokensForUSDC(paymentMethod === "usdc" && inputMode === "payment" ? paymentAmount : "0")
  // Calculate cost for token amount (tokens → payment)
  const { data: ethCost } = useCalculateETHCost(paymentMethod === "eth" && inputMode === "token" ? tokenAmount : "0")
  const { data: usdcCost } = useCalculateUSDCCost(paymentMethod === "usdc" && inputMode === "token" ? tokenAmount : "0")

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync token amount when payment changes (and user is editing payment field)
  useEffect(() => {
    if (inputMode === "payment" && paymentAmount && parseFloat(paymentAmount) > 0) {
      if (paymentMethod === "eth" && tokensForETH !== undefined) {
        const tokens = formatTokenAmount(tokensForETH as bigint)
        setTokenAmount(tokens)
      } else if (paymentMethod === "usdc" && tokensForUSDC !== undefined) {
        const tokens = formatTokenAmount(tokensForUSDC as bigint)
        setTokenAmount(tokens)
      }
    }
  }, [inputMode, paymentMethod, tokensForETH, tokensForUSDC])

  // Sync payment amount when token amount changes (and user is editing token field)
  useEffect(() => {
    if (inputMode === "token" && tokenAmount && parseFloat(tokenAmount) > 0) {
      if (paymentMethod === "eth" && ethCost !== undefined) {
        const cost = formatETHAmount(ethCost as bigint)
        setPaymentAmount(cost)
      } else if (paymentMethod === "usdc" && usdcCost !== undefined) {
        const cost = formatUSDCAmount(usdcCost as bigint)
        setPaymentAmount(cost)
      }
    }
  }, [inputMode, paymentMethod, ethCost, usdcCost])

  // Check if USDC approval is needed
  useEffect(() => {
    if (paymentMethod === "usdc" && paymentAmount && parseFloat(paymentAmount) > 0) {
      const paymentAmountWei = parseUnits(paymentAmount, 6) // USDC has 6 decimals
      const needsApprove = !usdcAllowance || usdcAllowance < paymentAmountWei
      setNeedsApproval(needsApprove)
    } else {
      setNeedsApproval(false)
    }
  }, [paymentMethod, paymentAmount, usdcAllowance])

  // Refetch allowance after successful approval
  useEffect(() => {
    if (isSuccessApproval) {
      refetchAllowance()
    }
  }, [isSuccessApproval, refetchAllowance])

  // Refetch data after successful purchase
  useEffect(() => {
    if (isSuccessETH || isSuccessUSDC) {
      // Refetch all relevant data after successful purchase
      refetchPurchasedAmount()
      refetchRemainingAllowance()
      refetchSaleStats()
      refetchAllowance() // USDC allowance may have changed
    }
  }, [isSuccessETH, isSuccessUSDC, refetchPurchasedAmount, refetchRemainingAllowance, refetchSaleStats, refetchAllowance])

  // Parse sale stats
  const stats = saleStats as readonly [bigint, bigint, bigint, bigint, bigint] | undefined
  const tokensSold = stats ? formatTokenAmount(stats[0]) : "0"
  const remainingSupply = stats ? formatTokenAmount(stats[1]) : "0"
  const totalBuyers = stats ? Number(stats[2]) : 0
  const totalRaisedETH = stats ? formatETHAmount(stats[3]) : "0"
  const totalRaisedUSDC = stats ? formatUSDCAmount(stats[4]) : "0"

  const userPurchased = formatTokenAmount(purchasedAmount as bigint | undefined)
  const userRemaining = formatTokenAmount(remainingAllowance as bigint | undefined)

  const progressPercent = stats
    ? Math.round((Number(formatTokenAmount(stats[0])) / 1_000_000) * 100)
    : 0

  const handleBuy = async () => {
    if (!isConnected || !tokenAmount || !paymentAmount) return

    try {
      if (paymentMethod === "eth") {
        await buyWithETH(paymentAmount)
      } else {
        if (needsApproval) {
          await approveUSDC(paymentAmount)
          setNeedsApproval(false)
        } else {
          await buyWithUSDC(paymentAmount)
        }
      }
    } catch (error) {
      console.error("Purchase failed:", error)
    }
  }

  const handleTokenAmountChange = (value: string) => {
    setInputMode("token")
    setTokenAmount(value)
    // Clear payment amount when entering token amount directly
    // The useEffect will calculate the correct payment amount
    if (!value || value === "0") {
      setPaymentAmount("")
    }
  }

  const handlePaymentAmountChange = (value: string) => {
    setInputMode("payment")
    setPaymentAmount(value)
    // Clear token amount when entering payment amount directly
    // The useEffect will calculate the correct token amount
    if (!value || value === "0") {
      setTokenAmount("")
    }
  }

  // Handle max button click
  const handleMaxPayment = () => {
    setInputMode("payment")
    if (paymentMethod === "eth" && ethBalance) {
      // Leave some ETH for gas (0.01 ETH)
      const maxEth = ethBalance.value > BigInt("10000000000000000")
        ? formatEther(ethBalance.value - BigInt("10000000000000000"))
        : "0"
      setPaymentAmount(maxEth)
    } else if (paymentMethod === "usdc" && usdcBalance) {
      setPaymentAmount(formatUnits(usdcBalance, 6))
    }
  }

  const isProcessing = isBuyingETH || isBuyingUSDC || isApproving || isConfirmingETH || isConfirmingUSDC || isConfirmingApproval
  const isSuccess = isSuccessETH || isSuccessUSDC
  const error = errorETH || errorUSDC

  const hasContractOnNetwork = contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000"

  // Check if token amount meets minimum requirement
  const minPurchaseAmount = parseFloat(DIRECT_SALE_CONFIG.minPurchase.replace(/,/g, ''))
  const currentTokenAmount = tokenAmount ? parseFloat(tokenAmount) : 0
  const isBelowMinimum = currentTokenAmount > 0 && currentTokenAmount < minPurchaseAmount

  // Check if user has sufficient balance for the payment
  const hasInsufficientBalance = (() => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return false
    if (paymentMethod === "eth") {
      if (!ethBalance) return true
      try {
        const paymentWei = parseUnits(paymentAmount, 18)
        return paymentWei > ethBalance.value
      } catch {
        return false
      }
    } else {
      if (!usdcBalance) return true
      try {
        const paymentWei = parseUnits(paymentAmount, 6)
        return paymentWei > usdcBalance
      } catch {
        return false
      }
    }
  })()

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Buy PULSE Tokens</h1>
        <p className="text-muted-foreground">
          Purchase PULSE tokens directly with ETH or USDC
        </p>
      </div>

      {/* Contract Warning */}
      {!hasContractOnNetwork && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            DirectTokenSale contract not deployed on this network. Please switch to Base Sepolia or deploy the contract first.
          </AlertDescription>
        </Alert>
      )}

      {/* Sale Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              Tokens Sold
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(tokensSold).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">of 1,000,000 PULSE</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Remaining
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(remainingSupply).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">PULSE available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Total Buyers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBuyers}</div>
            <p className="text-xs text-muted-foreground">participants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-purple-500" />
              Sale Status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isSaleActive ? "Active" : "Inactive"}
            </div>
            <p className="text-xs text-muted-foreground">{progressPercent}% sold</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sale Progress</span>
              <span className="font-semibold">{progressPercent}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Purchase Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Purchase PULSE Tokens</CardTitle>
              <CardDescription>
                Choose your payment method and enter the amount you want to buy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Method Tabs */}
              <Tabs value={paymentMethod} onValueChange={(v) => {
                setPaymentMethod(v as "eth" | "usdc")
                // Clear amounts when switching payment method
                setPaymentAmount("")
                setTokenAmount("")
              }}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="eth">Pay with ETH</TabsTrigger>
                  <TabsTrigger value="usdc">Pay with USDC</TabsTrigger>
                </TabsList>

                <TabsContent value="eth" className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="eth-amount">ETH Amount</Label>
                      {isConnected && (
                        <span className="text-xs text-muted-foreground">
                          Balance: {ethBalanceLoading ? "..." : ethBalance ? parseFloat(formatEther(ethBalance.value)).toFixed(4) : "0"} ETH
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="eth-amount"
                        type="number"
                        placeholder="0.0"
                        value={paymentAmount}
                        onChange={(e) => handlePaymentAmountChange(e.target.value)}
                        className="flex-1"
                      />
                      {isConnected && ethBalance && ethBalance.value > BigInt(0) && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleMaxPayment}
                          disabled={!isSaleActive}
                          className="shrink-0"
                        >
                          Max
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {ethPriceLoading
                        ? "Loading ETH price..."
                        : ethPriceUSD
                        ? formatETHToPulseRate(ethPriceUSD)
                        : "1 ETH = ~300,000 PULSE (price unavailable)"}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Rate based on live ETH price. 1 USDC = 100 PULSE.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="usdc" className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="usdc-amount">USDC Amount</Label>
                      {isConnected && (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs text-muted-foreground">
                            Balance: {usdcBalanceLoading ? "..." : usdcBalance ? parseFloat(formatUnits(usdcBalance, 6)).toFixed(2) : "0"} USDC
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Allowance: {usdcAllowance !== undefined ? parseFloat(formatUnits(usdcAllowance, 6)).toFixed(2) : "0"} USDC
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="usdc-amount"
                        type="number"
                        placeholder="0.0"
                        value={paymentAmount}
                        onChange={(e) => handlePaymentAmountChange(e.target.value)}
                        className="flex-1"
                      />
                      {isConnected && usdcBalance && usdcBalance > BigInt(0) && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleMaxPayment}
                          disabled={!isSaleActive}
                          className="shrink-0"
                        >
                          Max
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      1 USDC = 100 PULSE (0.01 USDC per PULSE)
                    </p>
                    {/* Approval Warning */}
                    {needsApproval && paymentAmount && parseFloat(paymentAmount) > 0 && (
                      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-700 dark:text-amber-300">
                          You need to approve {paymentAmount} USDC before purchasing. Click "Approve USDC" below.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Token Amount */}
              <div className="space-y-2">
                <Label htmlFor="token-amount">PULSE Tokens to Receive</Label>
                <Input
                  id="token-amount"
                  type="number"
                  placeholder="0.0"
                  value={tokenAmount}
                  onChange={(e) => handleTokenAmountChange(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Min: {DIRECT_SALE_CONFIG.minPurchase} PULSE | Max: {userRemaining || DIRECT_SALE_CONFIG.maxPurchasePerWallet} PULSE remaining
                </p>
              </div>

              {/* Success Message */}
              {isSuccess && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    Purchase successful! Your PULSE tokens have been transferred to your wallet.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Message */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error.message || "Transaction failed. Please try again."}
                  </AlertDescription>
                </Alert>
              )}

              {/* Minimum Amount Warning */}
              {isBelowMinimum && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Minimum purchase is {DIRECT_SALE_CONFIG.minPurchase} PULSE. You entered {currentTokenAmount} PULSE.
                  </AlertDescription>
                </Alert>
              )}

              {/* Insufficient Balance Warning */}
              {hasInsufficientBalance && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Insufficient {paymentMethod === "eth" ? "ETH" : "USDC"} balance. You need {paymentAmount} {paymentMethod.toUpperCase()} but only have {paymentMethod === "eth" ? (ethBalance ? parseFloat(formatEther(ethBalance.value)).toFixed(4) : "0") : (usdcBalance ? parseFloat(formatUnits(usdcBalance, 6)).toFixed(2) : "0")} {paymentMethod.toUpperCase()}.
                  </AlertDescription>
                </Alert>
              )}

              {/* Sale Inactive Warning */}
              {!isSaleActive && tokenAmount && parseFloat(tokenAmount) > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The token sale is currently inactive. Please check back later.
                  </AlertDescription>
                </Alert>
              )}

              {/* Buy Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleBuy}
                disabled={!isConnected || !tokenAmount || !paymentAmount || isProcessing || !isSaleActive || isBelowMinimum || hasInsufficientBalance}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isApproving || isConfirmingApproval ? "Approving USDC..." : "Processing..."}
                  </>
                ) : !isConnected ? (
                  "Connect Wallet to Buy"
                ) : !isSaleActive ? (
                  "Sale Inactive"
                ) : hasInsufficientBalance ? (
                  "Insufficient Balance"
                ) : needsApproval ? (
                  "Approve USDC"
                ) : (
                  `Buy ${tokenAmount || "0"} PULSE`
                )}
              </Button>

              {paymentMethod === "usdc" && !needsApproval && (
                <p className="text-xs text-muted-foreground text-center">
                  You may need to approve USDC spending before purchasing
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Stats & Info */}
        <div className="space-y-4">
          {/* Your Purchase Stats */}
          {isConnected && (
            <Card>
              <CardHeader>
                <CardTitle>Your Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Purchased</p>
                  <p className="text-2xl font-bold">{Number(userPurchased).toLocaleString()} PULSE</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining Allowance</p>
                  <p className="text-2xl font-bold">{Number(userRemaining).toLocaleString()} PULSE</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Token Info */}
          <Card>
            <CardHeader>
              <CardTitle>Token Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="font-semibold">{DIRECT_SALE_CONFIG.tokenPrice} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min Purchase</span>
                <span className="font-semibold">{DIRECT_SALE_CONFIG.minPurchase} PULSE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Per Wallet</span>
                <span className="font-semibold">{DIRECT_SALE_CONFIG.maxPurchasePerWallet} PULSE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Supply</span>
                <span className="font-semibold">{DIRECT_SALE_CONFIG.totalSupply} PULSE</span>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Connect your wallet</li>
                <li>Choose payment method (ETH or USDC)</li>
                <li>Enter amount you want to buy</li>
                <li>Approve USDC if paying with USDC</li>
                <li>Confirm transaction</li>
                <li>Receive PULSE tokens instantly</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
