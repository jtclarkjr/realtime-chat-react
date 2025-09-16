import { CACHE_SETTINGS } from './constants'

export const CacheUtils = {
  /**
   * Generate a versioned cache key
   */
  versionedKey: (baseKey: string, version: number = 1): string => {
    return `${baseKey}:v${version}`
  },

  /**
   * Generate a timestamped cache key
   */
  timestampedKey: (baseKey: string): string => {
    return `${baseKey}:${Date.now()}`
  },

  /**
   * Extract ID from cache key
   */
  extractId: (key: string, pattern: string): string | null => {
    const regex = new RegExp(pattern.replace(/\*/g, '(.+)'))
    const match = key.match(regex)
    return match ? match[1] : null
  },

  /**
   * Check if cache key matches pattern
   */
  matchesPattern: (key: string, pattern: string): boolean => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return regex.test(key)
  },

  /**
   * Generate cache key for paginated data
   */
  paginatedKey: (baseKey: string, page: number, limit: number): string => {
    return `${baseKey}:page:${page}:limit:${limit}`
  },

  /**
   * Calculate remaining TTL as percentage
   */
  calculateTTLPercentage: (createdAt: number, ttlSeconds: number): number => {
    const age = Date.now() - createdAt
    const maxAge = ttlSeconds * 1000
    return Math.max(0, (maxAge - age) / maxAge)
  },

  /**
   * Check if cache entry should be refreshed in background
   */
  shouldBackgroundRefresh: (createdAt: number, ttlSeconds: number): boolean => {
    const ttlPercentage = CacheUtils.calculateTTLPercentage(
      createdAt,
      ttlSeconds
    )
    return ttlPercentage <= 1 - CACHE_SETTINGS.BACKGROUND_REFRESH_THRESHOLD
  }
}
