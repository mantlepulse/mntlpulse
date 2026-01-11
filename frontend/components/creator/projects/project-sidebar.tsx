'use client'

import { useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ProjectFolderItem } from './project-folder-item'
import { useCreatorProjects } from '@/hooks/use-projects'
import { Skeleton } from '@/components/ui/skeleton'
import { PollDragData } from '@/lib/dnd/dnd-types'

interface ProjectSidebarProps {
  activeDragData?: PollDragData | null
  onCreateProject?: () => void
}

export function ProjectSidebar({ activeDragData, onCreateProject }: ProjectSidebarProps) {
  const { data: projects, isLoading } = useCreatorProjects('active')

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('project-sidebar-collapsed') === 'true'
    }
    return false
  })

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem('project-sidebar-collapsed', String(collapsed))
  }, [collapsed])

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 p-2 border-r bg-muted/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(false)}
          className="shrink-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <aside className="w-[280px] border-r bg-muted/30 flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-sm">Projects</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onCreateProject}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Project List */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {isLoading && (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          )}

          {!isLoading && projects && projects.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <p className="mb-2">No projects yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateProject}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          )}

          {!isLoading && projects?.map((project) => (
            <ProjectFolderItem
              key={project.id}
              project={project}
              activeDragData={activeDragData}
            />
          ))}
        </div>
      </ScrollArea>
    </aside>
  )
}
