'use client'

/**
 * Creator Questionnaires Page
 * Manage questionnaires created by the creator
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreatorBreadcrumb } from '@/components/creator/creator-breadcrumb'
import { QuestionnaireCard } from '@/components/questionnaire/questionnaire-card'
import {
  useCreatorQuestionnaires,
  useArchiveQuestionnaire,
  useUpdateQuestionnaire,
} from '@/hooks/use-questionnaires'
import { toast } from 'sonner'
import {
  Plus,
  ListChecks,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  Archive,
} from 'lucide-react'

export default function CreatorQuestionnairesPage() {
  const router = useRouter()
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState('active')

  // Fetch creator's questionnaires
  const {
    data: questionnaires,
    isLoading,
    refetch,
  } = useCreatorQuestionnaires()

  const { mutateAsync: archiveQuestionnaire } = useArchiveQuestionnaire()
  const { mutateAsync: updateQuestionnaire, isPending: isUpdating } = useUpdateQuestionnaire()

  // Filter questionnaires by status
  const activeQuestionnaires = questionnaires?.filter((q) => q.status === 'active') || []
  const draftQuestionnaires = questionnaires?.filter((q) => q.status === 'draft') || []
  const archivedQuestionnaires = questionnaires?.filter((q) => q.status === 'archived' || q.status === 'closed') || []

  // Calculate stats
  const totalQuestionnaires = questionnaires?.length || 0
  const totalCompletions = questionnaires?.reduce((sum, q) => sum + q.completionCount, 0) || 0
  const totalPolls = questionnaires?.reduce((sum, q) => sum + q.pollCount, 0) || 0

  const handleArchive = async (id: string) => {
    try {
      await archiveQuestionnaire(id)
      toast.success('Questionnaire archived')
      refetch()
    } catch (error) {
      toast.error('Failed to archive questionnaire')
    }
  }

  const handleToggleStatus = async (id: string, newStatus: 'active' | 'draft') => {
    try {
      await updateQuestionnaire({ id, status: newStatus })
      toast.success(newStatus === 'active' ? 'Questionnaire published' : 'Questionnaire unpublished')
      refetch()
    } catch (error) {
      toast.error('Failed to update questionnaire status')
    }
  }

  const handleEdit = (id: string) => {
    router.push(`/creator/questionnaires/${id}/edit`)
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <CreatorBreadcrumb />
        <Card className="mt-8">
          <CardContent className="py-16 text-center">
            <ListChecks className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Connect your wallet to create and manage questionnaires.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <CreatorBreadcrumb />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ListChecks className="w-8 h-8 text-primary" />
            Questionnaires
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage grouped polls as questionnaires
          </p>
        </div>
        <Button asChild>
          <Link href="/dapp/questionnaires/create">
            <Plus className="w-4 h-4 mr-2" />
            Create Questionnaire
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ListChecks className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Questionnaires</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{totalQuestionnaires}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{activeQuestionnaires.length}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Completions</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{totalCompletions}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Polls</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{totalPolls}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Active, Draft, Archived */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Active
            {activeQuestionnaires.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeQuestionnaires.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="draft" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Drafts
            {draftQuestionnaires.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {draftQuestionnaires.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="w-4 h-4" />
            Archived
            {archivedQuestionnaires.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {archivedQuestionnaires.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Questionnaires</CardTitle>
              <CardDescription>
                Questionnaires that are currently live and accepting responses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ) : activeQuestionnaires.length === 0 ? (
                <div className="text-center py-12">
                  <ListChecks className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No active questionnaires</h3>
                  <p className="text-muted-foreground mb-4">
                    Create a questionnaire or publish a draft to get started.
                  </p>
                  <Button asChild>
                    <Link href="/dapp/questionnaires/create">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Questionnaire
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeQuestionnaires.map((questionnaire) => (
                    <QuestionnaireCard
                      key={questionnaire.id}
                      questionnaire={questionnaire}
                      showCreatorActions
                      onEdit={handleEdit}
                      onArchive={handleArchive}
                      onToggleStatus={handleToggleStatus}
                      isTogglingStatus={isUpdating}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="draft" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Draft Questionnaires</CardTitle>
              <CardDescription>
                Questionnaires that are not yet published. Publish them when ready.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ) : draftQuestionnaires.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No drafts</h3>
                  <p className="text-muted-foreground">
                    All your questionnaires are published or archived.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {draftQuestionnaires.map((questionnaire) => (
                    <QuestionnaireCard
                      key={questionnaire.id}
                      questionnaire={questionnaire}
                      showCreatorActions
                      onEdit={handleEdit}
                      onArchive={handleArchive}
                      onToggleStatus={handleToggleStatus}
                      isTogglingStatus={isUpdating}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archived" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Archived Questionnaires</CardTitle>
              <CardDescription>
                Questionnaires that have been archived or closed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1].map((i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ) : archivedQuestionnaires.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No archived questionnaires</h3>
                  <p className="text-muted-foreground">
                    Archived questionnaires will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archivedQuestionnaires.map((questionnaire) => (
                    <QuestionnaireCard
                      key={questionnaire.id}
                      questionnaire={questionnaire}
                      showCreatorActions
                      onEdit={handleEdit}
                      onArchive={handleArchive}
                      onToggleStatus={handleToggleStatus}
                      isTogglingStatus={isUpdating}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
