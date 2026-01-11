'use client'

import { useDroppable } from '@dnd-kit/core'
import { useRouter } from 'next/navigation'
import { Folder, MoreVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { canDropPollOnProject } from '@/lib/dnd/dnd-utils'
import { PollDragData } from '@/lib/dnd/dnd-types'
import type { Project } from '@/lib/api/projects-client'

interface ProjectFolderItemProps {
  project: Project
  activeDragData?: PollDragData | null
}

export function ProjectFolderItem({ project, activeDragData }: ProjectFolderItemProps) {
  const router = useRouter()

  const { setNodeRef, isOver, active } = useDroppable({
    id: `project-${project.id}`,
    data: { projectId: project.id, projectName: project.name },
  })

  // Check if poll can be dropped on this project
  const canDrop = activeDragData
    ? canDropPollOnProject(activeDragData, { projectId: project.id, projectName: project.name })
    : true

  const isDropTarget = isOver && active

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if we're in the middle of a drag operation
    if (active) {
      return
    }

    router.push(`/creator/projects/${project.id}`)
  }

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={cn(
        "group flex items-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer",
        "hover:bg-accent/50",
        isDropTarget && canDrop && "border-primary bg-primary/10 shadow-lg animate-pulse",
        isDropTarget && !canDrop && "border-destructive bg-destructive/10 opacity-60 cursor-not-allowed",
        !isDropTarget && "border-transparent"
      )}
    >
      <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="flex-1 text-sm font-medium truncate">{project.name}</span>
      <Badge variant="secondary" className="text-xs">
        {project.pollCount || 0}
      </Badge>
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation() // Prevent navigation when clicking the menu button
        }}
      >
        <MoreVertical className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  )
}
