'use client'

/**
 * Project Detail Page
 * View and manage a specific project with its polls
 */

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { CreatorBreadcrumb } from '@/components/creator/creator-breadcrumb'
import {
  useProject,
  useUpdateProject,
  useArchiveProject,
  useDeleteProject,
  useAddPollToProject,
  useRemovePollFromProject,
} from '@/hooks/use-projects'
import { ProjectWithPolls, ProjectStatus } from '@/lib/api/projects-client'
import {
  FolderKanban,
  ArrowLeft,
  MoreVertical,
  Edit,
  Archive,
  Trash2,
  Plus,
  Vote,
  BarChart3,
  Clock,
  CheckCircle,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { useChainId } from 'wagmi'
import { usePoll } from '@/lib/contracts/polls-contract-utils'

function ProjectPollCard({
  poll,
  projectId,
  onRemove,
}: {
  poll: { chainId: number; pollId: string; sortOrder: number; addedAt: string }
  projectId: string
  onRemove: () => void
}) {
  const [isRemoving, setIsRemoving] = useState(false)
  const router = useRouter()

  // Fetch poll data to get the actual question
  const { data: pollData } = usePoll(Number(poll.pollId))
  const pollQuestion = pollData?.[1] || `Poll #${poll.pollId}` // [1] is the question field

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div
        className="flex-1 cursor-pointer"
        onClick={() => router.push(`/dapp/poll/${poll.pollId}`)}
      >
        <div className="flex items-center gap-2">
          <Vote className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{pollQuestion}</span>
          <Badge variant="outline" className="text-xs">
            Chain {poll.chainId}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Added {formatDistanceToNow(new Date(poll.addedAt), { addSuffix: true })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setIsRemoving(true)
            onRemove()
          }}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <X className="w-4 h-4 text-destructive" />
          )}
        </Button>
      </div>
    </div>
  )
}

function AddPollDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const chainId = useChainId()
  const [pollId, setPollId] = useState('')
  const { mutateAsync: addPoll, isPending } = useAddPollToProject()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!pollId.trim()) {
      toast.error('Poll ID is required')
      return
    }

    try {
      await addPoll({
        projectId,
        chainId,
        pollId: pollId.trim(),
      })
      toast.success('Poll added to project')
      setPollId('')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add poll')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Poll to Project</DialogTitle>
          <DialogDescription>
            Enter the poll ID to add it to this project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pollId">Poll ID</Label>
              <Input
                id="pollId"
                placeholder="Enter poll ID (e.g., 1, 2, 3)"
                value={pollId}
                onChange={(e) => setPollId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Current chain: {chainId}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Poll
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditProjectDialog({
  project,
  open,
  onOpenChange,
}: {
  project: ProjectWithPolls
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || '')
  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const { mutateAsync: updateProject, isPending } = useUpdateProject()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Project name is required')
      return
    }

    try {
      await updateProject({
        id: project.id,
        name: name.trim(),
        description: description.trim() || undefined,
        status,
      })
      toast.success('Project updated')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update project')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update your project details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex gap-2">
                {(['active', 'completed', 'archived'] as ProjectStatus[]).map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={status === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatus(s)}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const projectId = params.id as string

  const { data: project, isLoading } = useProject(projectId, true) as {
    data: ProjectWithPolls | undefined
    isLoading: boolean
  }
  const { mutateAsync: archiveProject, isPending: isArchiving } = useArchiveProject()
  const { mutateAsync: deleteProject, isPending: isDeleting } = useDeleteProject()
  const { mutateAsync: removePoll } = useRemovePollFromProject()

  const [addPollOpen, setAddPollOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)

  const handleArchive = async () => {
    try {
      await archiveProject(projectId)
      toast.success('Project archived')
      router.push('/creator/projects')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to archive project')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteProject(projectId)
      toast.success('Project deleted')
      router.push('/creator/projects')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete project')
    }
  }

  const handleRemovePoll = async (pollChainId: number, pollId: string) => {
    try {
      await removePoll({ projectId, chainId: pollChainId, pollId })
      toast.success('Poll removed from project')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove poll')
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <CreatorBreadcrumb />
        <Card className="mt-8">
          <CardContent className="py-16 text-center">
            <FolderKanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Connect your wallet to view this project.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-8">
        <CreatorBreadcrumb />
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8 px-4">
        <CreatorBreadcrumb />
        <Card className="mt-8">
          <CardContent className="py-16 text-center">
            <FolderKanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This project doesn't exist or you don't have access to it.
            </p>
            <Button asChild>
              <Link href="/creator/projects">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusColors: Record<ProjectStatus, string> = {
    active: 'bg-green-500/10 text-green-500',
    completed: 'bg-blue-500/10 text-blue-500',
    archived: 'bg-gray-500/10 text-gray-500',
  }

  const statusIcons: Record<ProjectStatus, React.ReactNode> = {
    active: <Clock className="w-3 h-3" />,
    completed: <CheckCircle className="w-3 h-3" />,
    archived: <Archive className="w-3 h-3" />,
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <CreatorBreadcrumb />

      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/creator/projects')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Projects
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <Badge variant="outline" className={statusColors[project.status]}>
              {statusIcons[project.status]}
              <span className="ml-1 capitalize">{project.status}</span>
            </Badge>
          </div>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {project.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAddPollOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Poll
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchive} disabled={isArchiving}>
                <Archive className="w-4 h-4 mr-2" />
                Archive Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteAlertOpen(true)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Vote className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Polls</p>
                <p className="text-2xl font-bold">{project.pollCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Votes</p>
                <p className="text-2xl font-bold">{project.totalVotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-lg font-medium">
                  {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Polls List */}
      <Card>
        <CardHeader>
          <CardTitle>Polls in Project</CardTitle>
          <CardDescription>
            Manage the polls included in this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {project.polls && project.polls.length > 0 ? (
            <div className="space-y-3">
              {project.polls.map((poll) => (
                <ProjectPollCard
                  key={`${poll.chainId}-${poll.pollId}`}
                  poll={poll}
                  projectId={projectId}
                  onRemove={() => handleRemovePoll(poll.chainId, poll.pollId)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Vote className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No polls yet</h3>
              <p className="text-muted-foreground mb-4">
                Add polls to this project to start tracking insights.
              </p>
              <Button onClick={() => setAddPollOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Poll
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddPollDialog
        projectId={projectId}
        open={addPollOpen}
        onOpenChange={setAddPollOpen}
      />

      <EditProjectDialog
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project "{project.name}" and remove all poll associations.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Project'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
