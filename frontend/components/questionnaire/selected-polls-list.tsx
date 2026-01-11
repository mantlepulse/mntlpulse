"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GripVertical, X, ListChecks } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { SelectedPoll } from "./poll-selector"

interface SelectedPollsListProps {
  polls: SelectedPoll[]
  onReorder: (polls: SelectedPoll[]) => void
  onRemove: (pollId: string, chainId: number) => void
  disabled?: boolean
}

export function SelectedPollsList({
  polls,
  onReorder,
  onRemove,
  disabled,
}: SelectedPollsListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const sortableItems = useMemo(
    () => polls.map((p) => `${p.chainId}-${p.pollId}`),
    [polls]
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortableItems.indexOf(active.id as string)
      const newIndex = sortableItems.indexOf(over.id as string)

      const newPolls = arrayMove(polls, oldIndex, newIndex).map(
        (poll, index) => ({
          ...poll,
          sortOrder: index,
        })
      )

      onReorder(newPolls)
    }
  }

  if (polls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg text-center min-h-[200px]">
        <ListChecks className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground font-medium">No polls added yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Click on polls from the left to add them here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Selected Polls ({polls.length})
        </p>
        <p className="text-xs text-muted-foreground">
          Drag to reorder
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableItems}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {polls.map((poll, index) => (
              <SortablePollItem
                key={`${poll.chainId}-${poll.pollId}`}
                poll={poll}
                index={index}
                onRemove={() => onRemove(poll.pollId, poll.chainId)}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

interface SortablePollItemProps {
  poll: SelectedPoll
  index: number
  onRemove: () => void
  disabled?: boolean
}

function SortablePollItem({
  poll,
  index,
  onRemove,
  disabled,
}: SortablePollItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${poll.chainId}-${poll.pollId}`,
    disabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "opacity-50 shadow-lg" : ""}`}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
          disabled={disabled}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{poll.question}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {poll.source === "new" ? "New" : "Existing"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Poll #{poll.pollId}
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
          className="text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
