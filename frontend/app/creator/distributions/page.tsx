/**
 * Distributions Page
 * Dedicated page for viewing distribution history
 */

"use client"

import { useState, useEffect } from "react"
import { useAccount, useChainId } from "wagmi"
import { AlertCircle } from "lucide-react"
import { DistributionsTab } from "@/components/creator/distributions-tab"
import { fetchCreatorDistributions } from "@/lib/api/analytics"
import { CreatorBreadcrumb } from "@/components/creator/creator-breadcrumb"

export default function DistributionsPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [distributions, setDistributions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDistributions = async () => {
      if (!isConnected || !address || !chainId) return

      setIsLoading(true)
      setError(null)
      try {
        // Fetch distributions for all creator's polls
        const data = await fetchCreatorDistributions(address, chainId)
        setDistributions(data)
      } catch (error) {
        console.error("Failed to load distributions:", error)
        setError("Failed to load distribution history. Please try again.")
        setDistributions([])
      } finally {
        setIsLoading(false)
      }
    }

    loadDistributions()
  }, [isConnected, address, chainId])

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-amber-800 dark:text-amber-200 mb-2">
              Wallet Not Connected
            </h2>
            <p className="text-amber-700 dark:text-amber-300">
              Please connect your wallet to view distributions.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <CreatorBreadcrumb />

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Distribution History</h1>
          <p className="text-muted-foreground">
            View all reward distributions and withdrawal events
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DistributionsTab distributions={distributions} isLoading={isLoading} />
      </div>
    </div>
  )
}
