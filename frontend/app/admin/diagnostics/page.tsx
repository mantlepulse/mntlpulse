"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { useAccount, useChainId } from "wagmi"
import { usePollsContractAddress } from "@/lib/contracts/polls-contract-utils"
import { usePulseTokenAddress, usePulseBalance } from "@/lib/contracts/premium-contract-utils"
import { useQuadraticVotingDiagnostics } from "@/lib/contracts/quadratic-voting-diagnostics"
import { formatEther } from "viem"

export default function DiagnosticsPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const contractAddress = usePollsContractAddress()
  const pulseToken = usePulseTokenAddress()
  const { data: pulseBalance } = usePulseBalance(address)

  const {
    isReady: qvReady,
    isLoading: qvLoading,
    pulseToken: contractPulseToken,
    treasury: qvTreasury,
    issues: qvIssues,
  } = useQuadraticVotingDiagnostics()

  const StatusIcon = ({ ready }: { ready: boolean | undefined }) => {
    if (ready === undefined) return <Loader2 className="h-4 w-4 animate-spin" />
    return ready ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quadratic Voting Diagnostics</h1>
        <p className="text-muted-foreground">
          Check the configuration status of quadratic voting
        </p>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {qvLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : qvReady ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
            Overall Status
          </CardTitle>
          <CardDescription>
            {qvLoading
              ? "Checking configuration..."
              : qvReady
              ? "Quadratic voting is properly configured"
              : "Quadratic voting has configuration issues"}
          </CardDescription>
        </CardHeader>
        {qvIssues.length > 0 && (
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-500">Issues Found:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {qvIssues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Connected</span>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Yes" : "No"}
            </Badge>
          </div>
          {isConnected && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Address</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Chain ID</span>
                <Badge variant="outline">{chainId}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">PULSE Balance</span>
                <span className="text-sm font-medium">
                  {pulseBalance ? formatEther(pulseBalance) : "0"} PULSE
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Contract Addresses */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Addresses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Polls Contract</p>
            <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
              {contractAddress || "Not found"}
            </code>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">PULSE Token (from Premium Contract)</p>
            <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
              {pulseToken || "Not found"}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Quadratic Voting Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Quadratic Voting Configuration</CardTitle>
          <CardDescription>Settings stored in the Polls Contract</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">PULSE Token Set</span>
              <div className="flex items-center gap-2">
                <StatusIcon ready={contractPulseToken && contractPulseToken !== "0x0000000000000000000000000000000000000000"} />
                {contractPulseToken && contractPulseToken !== "0x0000000000000000000000000000000000000000" ? (
                  <Badge variant="default">Configured</Badge>
                ) : (
                  <Badge variant="destructive">Not Set</Badge>
                )}
              </div>
            </div>
            {contractPulseToken && contractPulseToken !== "0x0000000000000000000000000000000000000000" && (
              <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                {contractPulseToken}
              </code>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">QV Treasury Set</span>
              <div className="flex items-center gap-2">
                <StatusIcon ready={qvTreasury && qvTreasury !== "0x0000000000000000000000000000000000000000"} />
                {qvTreasury && qvTreasury !== "0x0000000000000000000000000000000000000000" ? (
                  <Badge variant="default">Configured</Badge>
                ) : (
                  <Badge variant="destructive">Not Set</Badge>
                )}
              </div>
            </div>
            {qvTreasury && qvTreasury !== "0x0000000000000000000000000000000000000000" && (
              <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                {qvTreasury}
              </code>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions Needed */}
      {qvIssues.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Actions Required
            </CardTitle>
            <CardDescription>
              The contract owner needs to run these commands
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(!contractPulseToken || contractPulseToken === "0x0000000000000000000000000000000000000000") && (
              <div className="space-y-2">
                <p className="text-sm font-medium">1. Set PULSE Token Address</p>
                <code className="text-xs bg-muted px-3 py-2 rounded block break-all font-mono">
                  await pollsContract.setPulseToken("{pulseToken || "0x..."}")
                </code>
              </div>
            )}
            {(!qvTreasury || qvTreasury === "0x0000000000000000000000000000000000000000") && (
              <div className="space-y-2">
                <p className="text-sm font-medium">2. Set Quadratic Voting Treasury</p>
                <code className="text-xs bg-muted px-3 py-2 rounded block break-all font-mono">
                  await pollsContract.setQuadraticVotingTreasury("0x...")
                </code>
                <p className="text-xs text-muted-foreground">
                  Replace 0x... with the treasury address where PULSE payments should go
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
