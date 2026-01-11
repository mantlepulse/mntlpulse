'use client'

/**
 * Create Season Page
 * Page for creating a new season/tournament
 */

import { useAccount } from 'wagmi'
import { Card, CardContent } from '@/components/ui/card'
import { CreatorBreadcrumb } from '@/components/creator/creator-breadcrumb'
import { SeasonCreationForm } from '@/components/creator/quests/season-creation-form'
import { Calendar } from 'lucide-react'

export default function CreateSeasonPage() {
  const { isConnected } = useAccount()

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <CreatorBreadcrumb />
        <Card className="mt-8">
          <CardContent className="py-16 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Connect your wallet to create a season for organizing quests and rewards.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 max-w-3xl">
      <CreatorBreadcrumb />

      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="w-8 h-8 text-primary" />
          Create Season
        </h1>
        <p className="text-muted-foreground mt-1">
          Create a new season to organize quests and distribute PULSE rewards
        </p>
      </div>

      <SeasonCreationForm />
    </div>
  )
}
