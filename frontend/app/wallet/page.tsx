"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wallet, ArrowDownUp, TrendingDown, TrendingUp, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useAccount, useChainId, useReadContract } from "wagmi"
import {
  useBuyWithETH,
  useBuyWithUSDC,
  useApproveUSDC,
  useSellForETH,
  useSellForUSDC,
  useApprovePULSE,
  useCalculateTokensForETH,
  useCalculateTokensForUSDC,
  useCalculateETHCost,
  useCalculateUSDCCost,
  useCalculateETHForTokens,
  useCalculateUSDCForTokens,
  formatTokenAmount,
  formatUSDCAmount,
  formatETHAmount,
  useDirectSaleAddress,
} from "@/lib/contracts/direct-sale-utils"
import { getPulseTokenAddress } from "@/lib/contracts/direct-sale-config"

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

export default function WalletPage() {
  const [mode, setMode] = useState<"buy" | "sell">("buy")
  const [paymentMethod, setPaymentMethod] = useState<"eth" | "usdc">("usdc")
  const [amount, setAmount] = useState("")
  const [tokenAmount, setTokenAmount] = useState("")
  const [mounted, setMounted] = useState(false)

  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const contractAddress = useDirectSaleAddress()
  const pulseTokenAddress = getPulseTokenAddress(chainId)

  // Get PULSE balance
  const { data: pulseBalance } = useReadContract({
    address: pulseTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Write hooks
  const { buyWithETH, isPending: isBuyingETH, isConfirming: isConfirmingBuyETH, isSuccess: isSuccessBuyETH, error: errorBuyETH } = useBuyWithETH()
  const { buyWithUSDC, isPending: isBuyingUSDC, isConfirming: isConfirmingBuyUSDC, isSuccess: isSuccessBuyUSDC, error: errorBuyUSDC } = useBuyWithUSDC()
  const { approveUSDC, isPending: isApprovingUSDC, isConfirming: isConfirmingApprovalUSDC, isSuccess: isSuccessApprovalUSDC } = useApproveUSDC()
  const { sellForETH, isPending: isSellingETH, isConfirming: isConfirmingSellETH, isSuccess: isSuccessSellETH, error: errorSellETH } = useSellForETH()
  const { sellForUSDC, isPending: isSellingUSDC, isConfirming: isConfirmingSellUSDC, isSuccess: isSuccessSellUSDC, error: errorSellUSDC } = useSellForUSDC()
  const { approvePULSE, isPending: isApprovingPULSE, isConfirming: isConfirmingApprovalPULSE, isSuccess: isSuccessApprovalPULSE } = useApprovePULSE()

  // Calculations
  const { data: tokensForETH } = useCalculateTokensForETH(mode === "buy" && paymentMethod === "eth" ? amount : "0")
  const { data: tokensForUSDC } = useCalculateTokensForUSDC(mode === "buy" && paymentMethod === "usdc" ? amount : "0")
  const { data: ethCost } = useCalculateETHCost(mode === "buy" && paymentMethod === "eth" ? tokenAmount : "0")
  const { data: usdcCost } = useCalculateUSDCCost(mode === "buy" && paymentMethod === "usdc" ? tokenAmount : "0")
  const { data: ethForTokens } = useCalculateETHForTokens(mode === "sell" && paymentMethod === "eth" ? tokenAmount : "0")
  const { data: usdcForTokens } = useCalculateUSDCForTokens(mode === "sell" && paymentMethod === "usdc" ? tokenAmount : "0")

  useEffect(() => {
    setMounted(true)
  }, [])

  // Update tokenAmount when calculation results change (for buy mode)
  useEffect(() => {
    if (mode === "buy" && amount && !isNaN(Number(amount)) && Number(amount) > 0) {
      if (paymentMethod === "eth" && tokensForETH) {
        setTokenAmount(formatTokenAmount(tokensForETH as bigint))
      } else if (paymentMethod === "usdc" && tokensForUSDC) {
        setTokenAmount(formatTokenAmount(tokensForUSDC as bigint))
      }
    }
  }, [tokensForETH, tokensForUSDC, mode, paymentMethod, amount])

  // Update amount when selling calculations change
  useEffect(() => {
    if (mode === "sell" && tokenAmount && !isNaN(Number(tokenAmount)) && Number(tokenAmount) > 0) {
      if (paymentMethod === "eth" && ethForTokens) {
        setAmount(formatETHAmount(ethForTokens as bigint))
      } else if (paymentMethod === "usdc" && usdcForTokens) {
        setAmount(formatUSDCAmount(usdcForTokens as bigint))
      }
    }
  }, [ethForTokens, usdcForTokens, mode, paymentMethod, tokenAmount])

  const userPulseBalance = formatTokenAmount(pulseBalance as bigint | undefined)

  const handleAmountChange = (value: string) => {
    setAmount(value)
    // tokenAmount will be updated via useEffect when calculation results arrive
  }

  const handleTokenAmountChange = (value: string) => {
    setTokenAmount(value)
    // amount will be updated via useEffect when calculation results arrive (sell mode)
  }

  const handleSwap = async () => {
    if (!isConnected) return

    try {
      if (mode === "buy") {
        if (paymentMethod === "eth") {
          await buyWithETH(amount)
        } else {
          await buyWithUSDC(amount)
        }
      } else {
        if (paymentMethod === "eth") {
          await sellForETH(tokenAmount)
        } else {
          await sellForUSDC(tokenAmount)
        }
      }
    } catch (error) {
      console.error("Swap failed:", error)
    }
  }

  const handleApprove = async () => {
    if (!isConnected) return
    try {
      if (mode === "buy") {
        await approveUSDC(amount)
      } else {
        await approvePULSE(tokenAmount)
      }
    } catch (error) {
      console.error("Approval failed:", error)
    }
  }

  const isProcessing = isBuyingETH || isBuyingUSDC || isSellingETH || isSellingUSDC ||
                      isApprovingUSDC || isApprovingPULSE ||
                      isConfirmingBuyETH || isConfirmingBuyUSDC || isConfirmingSellETH || isConfirmingSellUSDC ||
                      isConfirmingApprovalUSDC || isConfirmingApprovalPULSE

  const isSuccess = isSuccessBuyETH || isSuccessBuyUSDC || isSuccessSellETH || isSuccessSellUSDC
  const error = errorBuyETH || errorBuyUSDC || errorSellETH || errorSellUSDC

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">PULSE Wallet</h1>
        <p className="text-muted-foreground">
          Buy and sell PULSE tokens with ETH or USDC
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Swap Interface */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Swap PULSE</CardTitle>
                  <CardDescription>Buy or sell PULSE tokens instantly</CardDescription>
                </div>
                <Tabs value={mode} onValueChange={(v) => setMode(v as "buy" | "sell")}>
                  <TabsList>
                    <TabsTrigger value="buy">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Buy
                    </TabsTrigger>
                    <TabsTrigger value="sell">
                      <TrendingDown className="h-4 w-4 mr-2" />
                      Sell
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Method */}
              <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "eth" | "usdc")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="eth">ETH</TabsTrigger>
                  <TabsTrigger value="usdc">USDC</TabsTrigger>
                </TabsList>

                <TabsContent value="eth" className="space-y-4 mt-4">
                  {mode === "buy" ? (
                    <>
                      <div className="space-y-2">
                        <Label>You Pay (ETH)</Label>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={amount}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          disabled={!isConnected}
                        />
                      </div>
                      <div className="flex justify-center">
                        <ArrowDownUp className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <Label>You Receive (PULSE)</Label>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={tokenAmount}
                          onChange={(e) => handleTokenAmountChange(e.target.value)}
                          disabled={!isConnected}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>You Sell (PULSE)</Label>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={tokenAmount}
                          onChange={(e) => handleTokenAmountChange(e.target.value)}
                          disabled={!isConnected}
                        />
                      </div>
                      <div className="flex justify-center">
                        <ArrowDownUp className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <Label>You Receive (ETH)</Label>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={amount}
                          disabled
                        />
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="usdc" className="space-y-4 mt-4">
                  {mode === "buy" ? (
                    <>
                      <div className="space-y-2">
                        <Label>You Pay (USDC)</Label>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={amount}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          disabled={!isConnected}
                        />
                      </div>
                      <div className="flex justify-center">
                        <ArrowDownUp className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <Label>You Receive (PULSE)</Label>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={tokenAmount}
                          onChange={(e) => handleTokenAmountChange(e.target.value)}
                          disabled={!isConnected}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>You Sell (PULSE)</Label>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={tokenAmount}
                          onChange={(e) => handleTokenAmountChange(e.target.value)}
                          disabled={!isConnected}
                        />
                      </div>
                      <div className="flex justify-center">
                        <ArrowDownUp className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <Label>You Receive (USDC)</Label>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={amount}
                          disabled
                        />
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>

              {/* Success/Error Messages */}
              {isSuccess && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    Transaction successful!
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error.message || "Transaction failed"}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                {mode === "buy" && paymentMethod === "usdc" && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleApprove}
                    disabled={!isConnected || isProcessing}
                  >
                    {isApprovingUSDC || isConfirmingApprovalUSDC ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      "1. Approve USDC"
                    )}
                  </Button>
                )}
                {mode === "sell" && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleApprove}
                    disabled={!isConnected || isProcessing}
                  >
                    {isApprovingPULSE || isConfirmingApprovalPULSE ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      "1. Approve PULSE"
                    )}
                  </Button>
                )}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSwap}
                  disabled={!isConnected || !amount || !tokenAmount || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : !isConnected ? (
                    "Connect Wallet"
                  ) : (
                    `${mode === "sell" ? "2. " : ""}${mode === "buy" ? "Buy" : "Sell"} PULSE`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Balance & Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Your Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Number(userPulseBalance).toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">PULSE</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Buy Price</p>
                <p className="font-semibold">0.01 USDC per PULSE</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sell Price (2.5% spread)</p>
                <p className="font-semibold">0.00975 USDC per PULSE</p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  The 2.5% spread covers liquidity provision costs
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
