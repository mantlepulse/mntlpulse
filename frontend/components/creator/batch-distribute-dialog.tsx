/**
 * Batch Distribute Dialog Component
 * Allows poll creators to distribute rewards to multiple responders
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
import { toast } from "sonner"
import { Loader2, AlertCircle } from "lucide-react"
import { formatEther, parseEther } from "viem"

interface TokenBalance {
  token: string
  balance: bigint
  symbol: string
}

interface Voter {
  address: string
  votedOption: number
}

interface Distribution {
  recipient: string
  amount: string
}

interface BatchDistributeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pollId: bigint
  pollTitle: string
  balances: TokenBalance[]
  voters: Voter[]
  onDistribute: (
    pollId: bigint,
    token: string,
    recipients: string[],
    amounts: string[]
  ) => Promise<void>
  isPending?: boolean
}

type DistributionMethod = "equal" | "weighted" | "custom"

export function BatchDistributeDialog({
  open,
  onOpenChange,
  pollId,
  pollTitle,
  balances,
  voters,
  onDistribute,
  isPending = false,
}: BatchDistributeDialogProps) {
  const [selectedToken, setSelectedToken] = useState<string>("")
  const [method, setMethod] = useState<DistributionMethod>("equal")
  const [distributions, setDistributions] = useState<Distribution[]>([])

  // Initialize selected token
  useEffect(() => {
    if (balances.length > 0 && !selectedToken) {
      setSelectedToken(balances[0].token)
    }
  }, [balances, selectedToken])

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
      // For now, equal distribution - can be enhanced with voting weight
      const amountPerVoter = totalBalance / BigInt(voters.length)
      return voters.map((voter) => ({
        recipient: voter.address,
        amount: formatEther(amountPerVoter),
      }))
    }

    return distributions
  }, [selectedToken, method, voters, balances, distributions])

  useEffect(() => {
    if (method !== "custom") {
      setDistributions(calculateDistributions)
    }
  }, [method, calculateDistributions])

  const handleCustomAmountChange = (recipient: string, amount: string) => {
    setDistributions((prev) =>
      prev.map((d) => (d.recipient === recipient ? { ...d, amount } : d))
    )
  }

  const handleDistribute = async () => {
    if (!selectedToken) {
      toast.error("Please select a token")
      return
    }

    if (distributions.length === 0) {
      toast.error("No recipients to distribute to")
      return
    }

    // Validate amounts
    const selectedBalance = balances.find((b) => b.token === selectedToken)
    if (!selectedBalance) {
      toast.error("Selected token not found")
      return
    }

    const totalDistribution = distributions.reduce(
      (sum, d) => sum + parseEther(d.amount || "0"),
      BigInt(0)
    )

    if (totalDistribution > selectedBalance.balance) {
      toast.error("Total distribution exceeds available balance")
      return
    }

    try {
      const recipients = distributions.map((d) => d.recipient)
      const amounts = distributions.map((d) => parseEther(d.amount).toString())

      await onDistribute(pollId, selectedToken, recipients, amounts)
      toast.success("Distribution transaction submitted")
      onOpenChange(false)
      setDistributions([])
      setMethod("equal")
    } catch (error) {
      console.error("Distribution failed:", error)
      toast.error("Failed to distribute rewards")
    }
  }

  const selectedBalance = balances.find((b) => b.token === selectedToken)
  const totalDistribution = distributions.reduce(
    (sum, d) => sum + parseEther(d.amount || "0"),
    BigInt(0)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Distribute Rewards</DialogTitle>
          <DialogDescription>
            Distribute rewards to all responders of "{pollTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Token Selection */}
          <div className="space-y-2">
            <Label>Select Token</Label>
            {balances.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-3">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  No funds available to distribute
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

          {/* Distribution Method */}
          <div className="space-y-2">
            <Label>Distribution Method</Label>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as DistributionMethod)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="equal" id="equal" />
                <Label htmlFor="equal" className="cursor-pointer">
                  Equal distribution to all voters
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weighted" id="weighted" />
                <Label htmlFor="weighted" className="cursor-pointer">
                  Weighted by voting power (coming soon)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="cursor-pointer">
                  Custom amounts for each recipient
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Preview Table */}
          {voters.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-3">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                No voters found for this poll
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Distribution Preview ({voters.length} recipients)</Label>
              <div className="rounded-md border max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead className="text-right">Amount ({selectedBalance?.symbol})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distributions.map((dist, idx) => (
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
            </div>
          )}

          {/* Summary */}
          {selectedBalance && distributions.length > 0 && (
            <div className="rounded-lg border bg-muted p-3 space-y-2">
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
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setDistributions([])
              setMethod("equal")
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDistribute}
            disabled={
              isPending ||
              !selectedToken ||
              distributions.length === 0 ||
              balances.length === 0 ||
              totalDistribution > (selectedBalance?.balance || BigInt(0))
            }
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
