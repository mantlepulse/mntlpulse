'use client'

/**
 * Create Quest Page
 * Page for creating a new creator quest
 */

import { useAccount } from 'wagmi'
import { Card, CardContent } from '@/components/ui/card'
import { CreatorBreadcrumb } from '@/components/creator/creator-breadcrumb'
import { QuestCreationForm } from '@/components/creator/quests/quest-creation-form'
import { Target } from 'lucide-react'

export default function CreateQuestPage() {
  const { isConnected } = useAccount()

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <CreatorBreadcrumb />
        <Card className="mt-8">
          <CardContent className="py-16 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Connect your wallet to create a quest for your audience.
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
          <Target className="w-8 h-8 text-primary" />
          Create Quest
        </h1>
        <p className="text-muted-foreground mt-1">
          Create a new quest for your audience to complete and earn points
        </p>
      </div>

      <QuestCreationForm />
    </div>
  )
}
