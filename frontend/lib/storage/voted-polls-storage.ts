/**
 * LocalStorage utilities for caching user voted polls
 * Used to prevent double-voting and reduce contract calls
 */

export interface VotedPollsCache {
  pollIds: string[]
  lastFetchedAt: number // Unix timestamp in milliseconds
  totalCount: number
}

const CACHE_STORAGE_KEY_PREFIX = 'mantlepulse-voted-polls'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes TTL

/**
 * Get storage key for a specific address and chain
 */
export function getStorageKey(address: string, chainId: number): string {
  return `${CACHE_STORAGE_KEY_PREFIX}-${address.toLowerCase()}-${chainId}`
}

/**
 * Get cached voted polls from localStorage
 */
export function getVotedPollsCache(address: string, chainId: number): VotedPollsCache | null {
  if (typeof window === 'undefined') return null

  const key = getStorageKey(address, chainId)
  const stored = localStorage.getItem(key)

  if (!stored) return null

  try {
    return JSON.parse(stored) as VotedPollsCache
  } catch {
    return null
  }
}

/**
 * Save voted polls cache to localStorage
 */
export function setVotedPollsCache(address: string, chainId: number, cache: VotedPollsCache): void {
  if (typeof window === 'undefined') return

  const key = getStorageKey(address, chainId)
  localStorage.setItem(key, JSON.stringify(cache))
}

/**
 * Add a single voted poll to the cache
 * Used after user votes on a new poll
 */
export function addVotedPollToCache(address: string, chainId: number, pollId: string): void {
  const cache = getVotedPollsCache(address, chainId)

  if (cache) {
    if (!cache.pollIds.includes(pollId)) {
      cache.pollIds.push(pollId)
      cache.totalCount++
      setVotedPollsCache(address, chainId, cache)
    }
  } else {
    // Create new cache with just this poll
    setVotedPollsCache(address, chainId, {
      pollIds: [pollId],
      lastFetchedAt: Date.now(),
      totalCount: 1,
    })
  }
}

/**
 * Clear voted polls cache for a specific address and chain
 */
export function clearVotedPollsCache(address: string, chainId: number): void {
  if (typeof window === 'undefined') return

  const key = getStorageKey(address, chainId)
  localStorage.removeItem(key)
}

/**
 * Check if cache is still valid (within TTL)
 */
export function isCacheValid(cache: VotedPollsCache): boolean {
  return Date.now() - cache.lastFetchedAt < CACHE_TTL_MS
}
