/**
 * Withdraw Funds Dialog Component
 * Allows poll creators to withdraw funds from polls with no responses
 */

"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Loader2, AlertCircle } from "lucide-react"
import { formatEther, isAddress } from "viem"

interface TokenBalance {
  token: string
  balance: bigint
  symbol: string
}

interface WithdrawFundsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pollId: bigint
  pollTitle: string
  balances: TokenBalance[]
  onWithdraw: (pollId: bigint, recipient: string, tokens: string[]) => Promise<void>
  isPending?: boolean
}

export function WithdrawFundsDialog({
  open,
  onOpenChange,
  pollId,
  pollTitle,
  balances,
  onWithdraw,
  isPending = false,
}: WithdrawFundsDialogProps) {
  const [recipient, setRecipient] = useState("")
  const [selectedTokens, setSelectedTokens] = useState<string[]>([])

  const handleTokenToggle = (token: string) => {
    setSelectedTokens((prev) =>
      prev.includes(token)
        ? prev.filter((t) => t !== token)
        : [...prev, token]
    )
  }

  const handleSelectAll = () => {
    if (selectedTokens.length === balances.length) {
      setSelectedTokens([])
    } else {
      setSelectedTokens(balances.map((b) => b.token))
    }
  }

  const handleWithdraw = async () => {
    if (!recipient) {
      toast.error("Please enter a recipient address")
      return
    }

    if (!isAddress(recipient)) {
      toast.error("Invalid recipient address")
      return
    }

    if (selectedTokens.length === 0) {
      toast.error("Please select at least one token")
      return
    }

    try {
      await onWithdraw(pollId, recipient, selectedTokens)
      toast.success("Withdrawal transaction submitted")
      onOpenChange(false)
      setRecipient("")
      setSelectedTokens([])
    } catch (error) {
      console.error("Withdrawal failed:", error)
      toast.error("Failed to withdraw funds")
    }
  }

  const totalValue = selectedTokens.reduce((sum, token) => {
    const balance = balances.find((b) => b.token === token)?.balance || BigInt(0)
    return sum + balance
  }, BigInt(0))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
          <DialogDescription>
            Withdraw available funds from "{pollTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient Address */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              type="text"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Address that will receive the withdrawn funds
            </p>
          </div>

          {/* Token Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Tokens</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedTokens.length === balances.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>

            {balances.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-3">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  No funds available to withdraw
                </p>
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border p-3">
                {balances.map((balance) => (
                  <div
                    key={balance.token}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`token-${balance.token}`}
                        checked={selectedTokens.includes(balance.token)}
                        onCheckedChange={() => handleTokenToggle(balance.token)}
                      />
                      <Label
                        htmlFor={`token-${balance.token}`}
                        className="font-mono text-sm cursor-pointer"
                      >
                        {balance.symbol}
                      </Label>
                    </div>
                    <span className="text-sm font-medium">
                      {parseFloat(formatEther(balance.balance)).toFixed(6)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedTokens.length > 0 && (
            <div className="rounded-lg border bg-muted p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Selected:</span>
                <span className="font-medium">
                  {selectedTokens.length} token{selectedTokens.length > 1 ? "s" : ""}
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
              setRecipient("")
              setSelectedTokens([])
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleWithdraw}
            disabled={
              isPending ||
              !recipient ||
              selectedTokens.length === 0 ||
              balances.length === 0
            }
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Withdraw Funds"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
