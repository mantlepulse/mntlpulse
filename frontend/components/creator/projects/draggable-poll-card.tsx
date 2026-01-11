'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { PollCard } from '@/components/creator/poll-card'
import { getPollDragId } from '@/lib/dnd/dnd-utils'
import { usePollProjects } from '@/hooks/use-poll-projects'
import { ProjectBadges } from './project-badge'
import { useRemovePollFromProject } from '@/hooks/use-projects'
import { toast } from 'sonner'
import type { CreatorPoll } from '@/hooks/use-creator-dashboard-data'

interface DraggablePollCardProps {
  poll: CreatorPoll
  chainId: number
  creatorAddress: string
  displayTitle?: string | null
  onClosePoll?: (pollId: bigint) => void
  onSetDistributionMode?: (pollId: bigint, mode: number) => void
  onTitleUpdate?: (pollId: bigint, newTitle: string) => void
}

export function DraggablePollCard({
  poll,
  chainId,
  creatorAddress,
  displayTitle,
  onClosePoll,
  onSetDistributionMode,
  onTitleUpdate,
}: DraggablePollCardProps) {
  const { data: projects } = usePollProjects(chainId, poll.id)
  const removePollFromProject = useRemovePollFromProject()

  const dragId = getPollDragId(chainId, poll.id)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: {
      type: 'poll',
      pollId: poll.id,
      chainId,
      question: poll.question,
      currentProjects: projects?.map(p => p.id) || [],
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  const handleRemoveFromProject = async (projectId: string) => {
    try {
      await removePollFromProject.mutateAsync({
        projectId,
        chainId,
        pollId: poll.id,
      })
      toast.success('Poll removed from project')
    } catch (error) {
      toast.error('Failed to remove poll from project')
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag Handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <div className="p-1 rounded bg-background/80 backdrop-blur-sm border">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      {/* Poll Card */}
      <PollCard
        poll={{
          id: BigInt(poll.pollId || poll.id),
          question: poll.question,
          isActive: poll.isActive,
          totalVotes: BigInt(poll.totalVotes || 0),
          totalFunding: BigInt(poll.totalFunding?.toString() || poll.totalFundingAmount?.toString() || '0'),
          endTime: BigInt(poll.endTime),
          distributionMode: (poll.distributionMode || 0) as 0 | 1 | 2,
          fundingToken: poll.fundingToken,
          fundingTokenSymbol: poll.fundingTokenSymbol,
          options: poll.options.map((opt, idx) => ({
            text: opt,
            votes: BigInt(poll.votes?.[idx]?.toString() || '0'),
          })),
        }}
        chainId={chainId}
        creatorAddress={creatorAddress}
        displayTitle={displayTitle}
        onClosePoll={onClosePoll || (() => {})}
        onSetDistributionMode={onSetDistributionMode || (() => {})}
        onTitleUpdate={onTitleUpdate}
      />

      {/* Project Badges */}
      {projects && projects.length > 0 && (
        <div className="absolute bottom-2 left-2 right-2">
          <ProjectBadges
            projects={projects}
            maxVisible={2}
            onRemove={handleRemoveFromProject}
          />
        </div>
      )}
    </div>
  )
}
