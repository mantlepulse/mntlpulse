"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Loader2, ListChecks, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useAccount, useChainId } from "wagmi"
import { QuestionnaireCard } from "@/components/questionnaire/questionnaire-card"
import {
  useActiveQuestionnaires,
  useCreatorQuestionnaires,
  useQuestionnaireProgress,
  useArchiveQuestionnaire,
  useUpdateQuestionnaire,
  type Questionnaire,
} from "@/hooks/use-questionnaires"
import { toast } from "sonner"

export default function QuestionnairesPage() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("browse")
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const { isConnected, address } = useAccount()
  const chainId = useChainId()

  // Fetch active questionnaires for participants
  const {
    data: activeQuestionnaires,
    isLoading: isLoadingActive,
    error: activeError,
  } = useActiveQuestionnaires(20, 0)

  // Fetch creator's questionnaires
  const {
    data: creatorQuestionnaires,
    isLoading: isLoadingCreator,
  } = useCreatorQuestionnaires()

  const { mutateAsync: archiveQuestionnaire } = useArchiveQuestionnaire()
  const { mutateAsync: updateQuestionnaire, isPending: isUpdating } = useUpdateQuestionnaire()

  const handleArchive = async (id: string) => {
    try {
      await archiveQuestionnaire(id)
      toast.success("Questionnaire archived")
    } catch (error) {
      toast.error("Failed to archive questionnaire")
    }
  }

  const handleToggleStatus = async (id: string, newStatus: 'active' | 'draft') => {
    try {
      await updateQuestionnaire({ id, status: newStatus })
      toast.success(newStatus === 'active' ? "Questionnaire published" : "Questionnaire unpublished")
    } catch (error) {
      toast.error("Failed to update questionnaire status")
    }
  }

  const handleEdit = (id: string) => {
    router.push(`/dapp/questionnaires/${id}/edit`)
  }

  // Filter for my questionnaires
  const myQuestionnaires = creatorQuestionnaires || []

  // Filter for questionnaires I've started (from progress)
  const activeList = activeQuestionnaires || []

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <ListChecks className="h-8 w-8 text-primary" />
                Questionnaires
              </h1>
              <p className="text-muted-foreground mt-1">
                Answer grouped polls and earn rewards
              </p>
            </div>
            {isConnected && (
              <Link href="/dapp/questionnaires/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Questionnaire
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            {isConnected && (
              <>
                <TabsTrigger value="my-questionnaires">
                  My Questionnaires ({myQuestionnaires.length})
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-6">
            {isLoadingActive ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : activeError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold">Failed to load questionnaires</h3>
                <p className="text-muted-foreground">Please try again later</p>
              </div>
            ) : activeList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No active questionnaires</h3>
                <p className="text-muted-foreground">
                  {isConnected
                    ? "Be the first to create a questionnaire!"
                    : "Connect your wallet to create questionnaires"}
                </p>
                {isConnected && (
                  <Link href="/dapp/questionnaires/create" className="mt-4">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Questionnaire
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeList.map((questionnaire) => (
                  <QuestionnaireCardWithProgress
                    key={questionnaire.id}
                    questionnaire={questionnaire}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Questionnaires Tab */}
          {isConnected && (
            <TabsContent value="my-questionnaires" className="space-y-6">
              {isLoadingCreator ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : myQuestionnaires.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No questionnaires yet</h3>
                  <p className="text-muted-foreground">
                    Create your first questionnaire to group polls together
                  </p>
                  <Link href="/dapp/questionnaires/create" className="mt-4">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Questionnaire
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myQuestionnaires.map((questionnaire) => (
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
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}

// Wrapper component to fetch progress for each questionnaire
function QuestionnaireCardWithProgress({ questionnaire }: { questionnaire: Questionnaire }) {
  const { data: progress } = useQuestionnaireProgress(questionnaire.id)

  return (
    <QuestionnaireCard
      questionnaire={questionnaire}
      progress={progress}
    />
  )
}
