'use client'

/**
 * Creator Quest Edit Page
 * Edit an existing quest
 */

import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreatorBreadcrumb } from '@/components/creator/creator-breadcrumb'
import { QuestCreationForm } from '@/components/creator/quests/quest-creation-form'
import { useQuestById } from '@/hooks/use-creator-quests'
import { ArrowLeft, Loader2, Target, AlertCircle } from 'lucide-react'

interface PageProps {
  params: { id: string }
}

export default function EditQuestPage({ params }: PageProps) {
  const router = useRouter()
  const { id } = params
  const { isConnected, address } = useAccount()

  // Fetch quest data
  const { data: quest, isLoading, error } = useQuestById(id)

  // Check if user is the creator
  const isCreator = quest && address && quest.creatorAddress.toLowerCase() === address.toLowerCase()

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <CreatorBreadcrumb />
        <Card className="mt-8">
          <CardContent className="py-16 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Connect your wallet to edit quests.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <CreatorBreadcrumb />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading quest...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !quest) {
    return (
      <div className="container mx-auto py-8 px-4">
        <CreatorBreadcrumb />
        <Card className="mt-8">
          <CardContent className="py-16 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Quest Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This quest doesn't exist or failed to load.
            </p>
            <Button onClick={() => router.push('/creator/quests')}>
              Back to Quests
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isCreator) {
    return (
      <div className="container mx-auto py-8 px-4">
        <CreatorBreadcrumb />
        <Card className="mt-8">
          <CardContent className="py-16 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Unauthorized</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to edit this quest.
            </p>
            <Button onClick={() => router.push('/creator/quests')}>
              Back to Quests
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <CreatorBreadcrumb />

      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/creator/quests')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quests
        </Button>

        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="w-8 h-8 text-primary" />
            Edit Quest
          </h1>
          <p className="text-muted-foreground mt-1">
            Update your quest details and settings
          </p>
        </div>
      </div>

      {/* Quest Form */}
      <QuestCreationForm quest={quest} />
    </div>
  )
}
