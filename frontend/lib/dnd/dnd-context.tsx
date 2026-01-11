'use client'

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors,
         MouseSensor, TouchSensor, KeyboardSensor, closestCenter } from '@dnd-kit/core'
import { useState } from 'react'
import { PollDragData } from './dnd-types'

interface DnDContextProviderProps {
  children: React.ReactNode
  onDragEnd: (event: DragEndEvent) => void | Promise<void>
}

export function DnDContextProvider({ children, onDragEnd }: DnDContextProviderProps) {
  const [activePoll, setActivePoll] = useState<PollDragData | null>(null)

  // Configure sensors for mouse, touch (mobile), and keyboard (a11y)
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 } // 8px before drag starts
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 } // Long press on mobile
    }),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActivePoll(event.active.data.current as PollDragData)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePoll(null)
    onDragEnd(event)
  }

  const handleDragCancel = () => {
    setActivePoll(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}

      {/* Drag overlay - follows cursor */}
      <DragOverlay>
        {activePoll && (
          <div className="opacity-90 rotate-2 scale-105 cursor-grabbing">
            <div className="p-4 rounded-lg border-2 border-primary bg-card shadow-2xl">
              <p className="font-medium">{activePoll.question}</p>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
