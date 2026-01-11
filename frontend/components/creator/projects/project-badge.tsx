'use client'

import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ProjectBadgeProps {
  projectName: string
  projectId: string
  onRemove?: (projectId: string) => void
  className?: string
}

export function ProjectBadge({ projectName, projectId, onRemove, className }: ProjectBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={cn("text-xs gap-1 pr-1", className)}
          >
            <span className="max-w-[100px] truncate">{projectName}</span>
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(projectId)
                }}
                className="hover:bg-secondary-foreground/20 rounded-sm p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Project: {projectName}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Display multiple project badges with "+N more" indicator
 */
interface ProjectBadgesProps {
  projects: Array<{ id: string; name: string }>
  maxVisible?: number
  onRemove?: (projectId: string) => void
}

export function ProjectBadges({ projects, maxVisible = 2, onRemove }: ProjectBadgesProps) {
  const visible = projects.slice(0, maxVisible)
  const remaining = projects.length - maxVisible

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visible.map((project) => (
        <ProjectBadge
          key={project.id}
          projectName={project.name}
          projectId={project.id}
          onRemove={onRemove}
        />
      ))}
      {remaining > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs">
                +{remaining} more
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {projects.slice(maxVisible).map((p) => (
                <div key={p.id}>{p.name}</div>
              ))}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
