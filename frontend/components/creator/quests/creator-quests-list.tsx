'use client'

/**
 * Creator Quests List Component
 * Displays and manages quests created by the creator
 */

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useCreatorQuests, useDeleteQuest, useDeactivateQuest } from '@/hooks/use-creator-quests'
import {
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Users,
  Target,
  Trophy,
  Power,
  PowerOff,
  Plus,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { CreatorQuest, CreatorQuestType } from '@/lib/api/creator-quests-client'

const questTypeLabels: Record<CreatorQuestType, string> = {
  participation: 'Participation',
  engagement_goal: 'Engagement Goal',
}

const requirementTypeLabels: Record<string, string> = {
  vote_on_polls: 'Vote on Polls',
  vote_on_specific_poll: 'Vote on Specific Poll',
  share_poll: 'Share Poll',
  first_n_voters: 'First N Voters',
  participate_n_polls: 'Participate in Polls',
}

export function CreatorQuestsList() {
  const { data: quests, isLoading, error } = useCreatorQuests()
  const deleteQuestMutation = useDeleteQuest()
  const deactivateQuestMutation = useDeactivateQuest()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [questToDelete, setQuestToDelete] = useState<CreatorQuest | null>(null)

  const filteredQuests = quests?.filter((quest) => {
    const matchesSearch = quest.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && quest.isActive) ||
      (statusFilter === 'inactive' && !quest.isActive)
    return matchesSearch && matchesStatus
  })

  const handleDelete = async () => {
    if (!questToDelete) return
    try {
      await deleteQuestMutation.mutateAsync(questToDelete.id)
      setQuestToDelete(null)
    } catch {
      // Error handled by mutation
    }
  }

  const handleDeactivate = async (quest: CreatorQuest) => {
    try {
      await deactivateQuestMutation.mutateAsync(quest.id)
    } catch {
      // Error handled by mutation
    }
  }

  const getStatusBadge = (quest: CreatorQuest) => {
    if (!quest.isActive) {
      return <Badge variant="secondary">Inactive</Badge>
    }
    if (quest.endTime && new Date(quest.endTime) < new Date()) {
      return <Badge variant="outline">Ended</Badge>
    }
    if (quest.startTime && new Date(quest.startTime) > new Date()) {
      return <Badge variant="outline">Scheduled</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  const getCompletionProgress = (quest: CreatorQuest) => {
    if (quest.maxCompletions === null) {
      return `${quest.currentCompletions} completions`
    }
    const percentage = Math.round((quest.currentCompletions / quest.maxCompletions) * 100)
    return `${quest.currentCompletions}/${quest.maxCompletions} (${percentage}%)`
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Failed to load quests. Please try again.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('active')}
          >
            Active
          </Button>
          <Button
            variant={statusFilter === 'inactive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('inactive')}
          >
            Inactive
          </Button>
        </div>
      </div>

      {/* Quests List */}
      {!filteredQuests || filteredQuests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Target className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">
            {searchQuery || statusFilter !== 'all' ? 'No quests found' : 'No quests yet'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first quest to engage your audience'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Button asChild>
              <Link href="/creator/quests/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Quest
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quest</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Completions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuests.map((quest) => (
                <TableRow key={quest.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <Link
                        href={`/creator/quests/${quest.id}`}
                        className="font-medium hover:underline"
                      >
                        {quest.name}
                      </Link>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {requirementTypeLabels[quest.requirements.type] || quest.requirements.type}:{' '}
                        {quest.requirements.target}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{questTypeLabels[quest.questType]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-500" />
                      <span className="font-medium">{quest.pointsReward}</span>
                      <span className="text-xs text-muted-foreground">pts</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{getCompletionProgress(quest)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(quest)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/creator/quests/${quest.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/creator/quests/${quest.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Quest
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/creator/quests/${quest.id}/participants`}>
                            <Users className="mr-2 h-4 w-4" />
                            View Participants
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {quest.isActive ? (
                          <DropdownMenuItem
                            onClick={() => handleDeactivate(quest)}
                            disabled={deactivateQuestMutation.isPending}
                          >
                            <PowerOff className="mr-2 h-4 w-4" />
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem asChild>
                            <Link href={`/creator/quests/${quest.id}/edit`}>
                              <Power className="mr-2 h-4 w-4" />
                              Reactivate
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setQuestToDelete(quest)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Quest
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!questToDelete} onOpenChange={() => setQuestToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quest</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{questToDelete?.name}&quot;? This action cannot
              be undone. All participant progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteQuestMutation.isPending}
            >
              {deleteQuestMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
