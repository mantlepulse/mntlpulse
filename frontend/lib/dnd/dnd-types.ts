export type DragItemType = 'poll'

export interface PollDragData {
  type: DragItemType
  pollId: string
  chainId: number
  question: string
  currentProjects: string[] // project IDs this poll is already in
}

export interface ProjectDropData {
  projectId: string
  projectName: string
}

export interface DndState {
  isDragging: boolean
  activePollId: string | null
  activeDropZone: string | null
}
