import { PollDragData, ProjectDropData } from './dnd-types'

/**
 * Check if a poll can be dropped on a project
 * Returns false if poll is already in the project
 */
export function canDropPollOnProject(
  poll: PollDragData,
  project: ProjectDropData
): boolean {
  return !poll.currentProjects.includes(project.projectId)
}

/**
 * Extract poll identifier for drag operations
 */
export function getPollDragId(chainId: number, pollId: string): string {
  return `poll-${chainId}-${pollId}`
}

/**
 * Parse poll drag ID back to chainId and pollId
 */
export function parsePollDragId(dragId: string): { chainId: number; pollId: string } | null {
  const match = dragId.match(/^poll-(\d+)-(.+)$/)
  if (!match) return null
  return { chainId: parseInt(match[1]), pollId: match[2] }
}

/**
 * Get project drop zone ID
 */
export function getProjectDropId(projectId: string): string {
  return `project-${projectId}`
}
