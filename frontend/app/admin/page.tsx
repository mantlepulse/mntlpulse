"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Shield, X, Settings, Timer } from "lucide-react"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { usePollsContractAddress, useDefaultClaimGracePeriod, useSetDefaultClaimGracePeriod } from "@/lib/contracts/polls-contract-utils"
import { POLLS_CONTRACT_ABI } from "@/lib/contracts/polls-contract"
import { toast } from "sonner"

export default function AdminPage() {
  const [pollIdToClose, setPollIdToClose] = useState("")
  const [tokenAddress, setTokenAddress] = useState("")
  const [tokenStatus, setTokenStatus] = useState(true)
  const [gracePeriodDays, setGracePeriodDays] = useState("")

  const { address, isConnected } = useAccount()
  const contractAddress = usePollsContractAddress()

  // Check if current user is owner
  const { data: owner } = useReadContract({
    address: contractAddress,
    abi: POLLS_CONTRACT_ABI,
    functionName: 'owner',
  })

  // Get current grace period
  const { data: currentGracePeriod, refetch: refetchGracePeriod } = useDefaultClaimGracePeriod()

  // Set grace period hook
  const {
    setDefaultClaimGracePeriod,
    isPending: isGracePeriodPending,
    isConfirming: isGracePeriodConfirming,
    isSuccess: isGracePeriodSuccess,
    error: gracePeriodError,
  } = useSetDefaultClaimGracePeriod()

  // Convert current grace period for display
  const currentGracePeriodSeconds = currentGracePeriod ? Number(currentGracePeriod) : 0
  const currentGracePeriodHours = currentGracePeriodSeconds / 3600
  const currentGracePeriodDays = currentGracePeriodSeconds / (24 * 60 * 60)

  // Format grace period display - show hours if less than 1 day, otherwise show days
  const formatGracePeriod = (seconds: number) => {
    if (seconds === 0) return "Disabled (no automatic deadline)"
    const hours = seconds / 3600
    const days = seconds / (24 * 3600)
    if (days >= 1) {
      return `${days} day${days !== 1 ? 's' : ''}`
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''}`
    }
  }

  // Refetch grace period after successful update
  useEffect(() => {
    if (isGracePeriodSuccess) {
      toast.success("Grace period updated successfully!")
      refetchGracePeriod()
      setGracePeriodDays("")
    }
  }, [isGracePeriodSuccess, refetchGracePeriod])

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const isOwner = address && owner && address.toLowerCase() === owner.toLowerCase()

  const closePoll = async () => {
    if (!pollIdToClose || !contractAddress) return
    
    try {
      await writeContract({
        address: contractAddress,
        abi: POLLS_CONTRACT_ABI,
        functionName: 'closePoll',
        args: [BigInt(pollIdToClose)],
      })
      toast.success("Poll close transaction submitted")
      setPollIdToClose("")
    } catch (error) {
      console.error("Close poll failed:", error)
      toast.error("Failed to close poll")
    }
  }

  const whitelistToken = async () => {
    if (!tokenAddress || !contractAddress) return

    try {
      await writeContract({
        address: contractAddress,
        abi: POLLS_CONTRACT_ABI,
        functionName: 'whitelistToken',
        args: [tokenAddress as `0x${string}`, tokenStatus],
      })
      toast.success("Token whitelist transaction submitted")
      setTokenAddress("")
    } catch (error) {
      console.error("Whitelist token failed:", error)
      toast.error("Failed to whitelist token")
    }
  }

  const handleSetGracePeriod = async () => {
    const days = parseFloat(gracePeriodDays)
    if (isNaN(days) || days < 0) {
      toast.error("Please enter a valid number")
      return
    }

    // Convert to seconds
    const gracePeriodSeconds = Math.round(days * 24 * 60 * 60)

    // 0 means disable, otherwise must be at least 1 hour (3600 seconds) and at most 365 days
    const minSeconds = 3600 // 1 hour
    const maxSeconds = 365 * 24 * 60 * 60 // 365 days

    if (gracePeriodSeconds !== 0 && (gracePeriodSeconds < minSeconds || gracePeriodSeconds > maxSeconds)) {
      toast.error("Grace period must be at least 1 hour and at most 365 days (or 0 to disable)")
      return
    }

    try {
      await setDefaultClaimGracePeriod(BigInt(gracePeriodSeconds))
    } catch (error) {
      console.error("Set grace period failed:", error)
      toast.error("Failed to set grace period")
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-amber-800 mb-2">Wallet Not Connected</h2>
            <p className="text-amber-700">Please connect your wallet to access the admin panel.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <X className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
            <p className="text-red-700">You are not the contract owner. Only the owner can access this admin panel.</p>
            <p className="text-sm text-red-600 mt-2">Owner: {owner}</p>
            <p className="text-sm text-red-600">Your address: {address}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Manage polls and contract settings
          </p>
        </div>

        {/* Contract Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Contract Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <Label className="text-sm font-medium">Contract Address</Label>
              <p className="text-sm text-muted-foreground font-mono">{contractAddress}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Owner Address</Label>
              <p className="text-sm text-muted-foreground font-mono">{owner}</p>
            </div>
          </CardContent>
        </Card>

        {/* Close Poll */}
        <Card>
          <CardHeader>
            <CardTitle>Close Poll</CardTitle>
            <CardDescription>
              Manually close an active poll before its end time
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pollId">Poll ID</Label>
              <Input
                id="pollId"
                type="number"
                placeholder="Enter poll ID to close"
                value={pollIdToClose}
                onChange={(e) => setPollIdToClose(e.target.value)}
              />
            </div>
            <Button 
              onClick={closePoll}
              disabled={!pollIdToClose || isPending || isConfirming}
            >
              {isPending || isConfirming ? "Processing..." : "Close Poll"}
            </Button>
          </CardContent>
        </Card>

        {/* Whitelist Token */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Token Whitelist</CardTitle>
            <CardDescription>
              Add or remove tokens from the whitelist for poll funding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tokenAddress">Token Address</Label>
              <Input
                id="tokenAddress"
                placeholder="0x..."
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="tokenStatus"
                checked={tokenStatus}
                onChange={(e) => setTokenStatus(e.target.checked)}
              />
              <Label htmlFor="tokenStatus">Enable token (uncheck to disable)</Label>
            </div>
            <Button
              onClick={whitelistToken}
              disabled={!tokenAddress || isPending || isConfirming}
            >
              {isPending || isConfirming ? "Processing..." : "Update Whitelist"}
            </Button>
          </CardContent>
        </Card>

        {/* Default Claim Grace Period */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Default Claim Grace Period
            </CardTitle>
            <CardDescription>
              Set the default grace period for poll rewards. When a poll is closed, participants will have this many days to claim their rewards before the creator can withdraw unclaimed funds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Current Grace Period</Label>
              <p className="text-lg font-semibold">
                {formatGracePeriod(currentGracePeriodSeconds)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gracePeriodDays">New Grace Period (days)</Label>
              <Input
                id="gracePeriodDays"
                type="number"
                min={0}
                max={365}
                placeholder="Enter days (0 to disable, 1-365 to enable)"
                value={gracePeriodDays}
                onChange={(e) => setGracePeriodDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Set to 0 to disable automatic deadline. Set 1-365 days for automatic claim deadline on poll closure.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Hour presets */}
              {[1, 6, 12].map((hours) => (
                <Button
                  key={`${hours}h`}
                  variant="outline"
                  size="sm"
                  onClick={() => setGracePeriodDays((hours / 24).toString())}
                >
                  {hours}h
                </Button>
              ))}
              {/* Day presets */}
              {[7, 14, 30, 90].map((days) => (
                <Button
                  key={`${days}d`}
                  variant="outline"
                  size="sm"
                  onClick={() => setGracePeriodDays(days.toString())}
                >
                  {days}d
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGracePeriodDays("0")}
              >
                Disable
              </Button>
            </div>

            <Button
              onClick={handleSetGracePeriod}
              disabled={!gracePeriodDays || isGracePeriodPending || isGracePeriodConfirming}
            >
              {isGracePeriodPending || isGracePeriodConfirming ? "Processing..." : "Update Grace Period"}
            </Button>

            {gracePeriodError && (
              <p className="text-sm text-red-500">Error: {gracePeriodError.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Transaction Status */}
        {isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">Transaction completed successfully!</p>
          </div>
        )}
      </div>
    </div>
  )
}
