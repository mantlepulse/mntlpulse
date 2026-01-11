/**
 * Donate to Treasury Dialog Component
 * UI for donating poll funds to treasury (contract feature pending)
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
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle, Sparkles } from "lucide-react"
import { formatEther } from "viem"

interface TokenBalance {
  token: string
  balance: bigint
  symbol: string
}

interface DonateTreasuryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pollId: bigint
  pollTitle: string
  balances: TokenBalance[]
}

export function DonateTreasuryDialog({
  open,
  onOpenChange,
  pollId,
  pollTitle,
  balances,
}: DonateTreasuryDialogProps) {
  const [selectedToken, setSelectedToken] = useState<string>("")
  const [amount, setAmount] = useState("")

  // Placeholder treasury address - will be from contract config
  const treasuryAddress = "0x0000000000000000000000000000000000000000"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Donate to Treasury</DialogTitle>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Coming Soon
            </Badge>
          </div>
          <DialogDescription>
            Donate funds from "{pollTitle}" to the community treasury
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Coming Soon Notice */}
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Feature In Development
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  The treasury donation feature is currently being added to the
                  smart contract. This UI is ready and will be enabled once the
                  contract is updated.
                </p>
              </div>
            </div>
          </div>

          {/* Token Selection (Disabled Preview) */}
          <div className="space-y-2 opacity-50">
            <Label>Select Token</Label>
            <Select disabled>
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
          </div>

          {/* Amount Input (Disabled Preview) */}
          <div className="space-y-2 opacity-50">
            <Label>Amount to Donate</Label>
            <Input
              type="number"
              step="0.000001"
              placeholder="0.0"
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Donate funds to support future giveaways and community initiatives
            </p>
          </div>

          {/* Treasury Address Preview */}
          <div className="space-y-2 opacity-50">
            <Label>Treasury Address</Label>
            <div className="flex items-center gap-2 rounded-lg border p-2">
              <span className="text-xs font-mono text-muted-foreground">
                {treasuryAddress.slice(0, 10)}...{treasuryAddress.slice(-8)}
              </span>
            </div>
          </div>

          {/* Benefits */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">Why Donate to Treasury?</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Support community giveaways</li>
              <li>Fund future poll rewards</li>
              <li>Contribute to platform growth</li>
              <li>Help onboard new users</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button disabled>
            <Sparkles className="mr-2 h-4 w-4" />
            Coming Soon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
