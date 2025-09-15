/**
 * Redis cache configuration and key management
 * Centralized configuration for all Redis caching patterns
 */

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  // Room-related caches
  ROOMS_ALL: 300, // 5 minutes - frequently accessed, should be fresh
  ROOM_INDIVIDUAL: 3600, // 1 hour - individual rooms change less frequently
  ROOM_METADATA: 1800, // 30 minutes - room count, stats, etc.

  // Message-related caches (if needed in future)
  MESSAGE_HISTORY: 600, // 10 minutes
  MESSAGE_METADATA: 300, // 5 minutes

  // User-related caches (if needed)
  USER_SESSION: 86400, // 24 hours
  USER_PREFERENCES: 3600, // 1 hour

  // System-related caches
  SYSTEM_CONFIG: 86400, // 24 hours
  HEALTH_CHECK: 60 // 1 minute
} as const

// Cache key patterns
export const CACHE_KEYS = {
  // Room keys
  ROOMS_ALL: 'rooms:all',
  ROOM_BY_ID: (id: string) => `room:${id}`,
  ROOM_COUNT: 'rooms:count',
  ROOM_LAST_SYNC: 'rooms:last_sync',

  // Message keys (for future use)
  MESSAGE_HISTORY: (roomId: string, page: number = 0) =>
    `messages:room:${roomId}:page:${page}`,
  MESSAGE_COUNT: (roomId: string) => `messages:room:${roomId}:count`,

  // User keys (for future use)
  USER_SESSION: (userId: string) => `user:session:${userId}`,
  USER_ROOMS: (userId: string) => `user:rooms:${userId}`,

  // System keys
  SYSTEM_STATUS: 'system:status',
  RECONCILIATION_LOCK: 'lock:reconciliation',
  CACHE_STATS: 'cache:stats'
} as const

// Cache operation settings
export const CACHE_SETTINGS = {
  // How often to check if cache needs reconciliation (in milliseconds)
  RECONCILIATION_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes

  // How old cache can be before forcing refresh (in milliseconds)
  SYNC_THRESHOLD: 60 * 1000, // 1 minute

  // Maximum number of retry attempts for cache operations
  MAX_RETRY_ATTEMPTS: 3,

  // Retry delay (in milliseconds)
  RETRY_DELAY: 1000,

  // Background refresh settings
  BACKGROUND_REFRESH_ENABLED: true,
  BACKGROUND_REFRESH_THRESHOLD: 0.8, // Refresh when 80% of TTL has elapsed

  // Cache warming settings
  WARM_CACHE_ON_STARTUP: true,
  WARM_CACHE_DELAY: 1000 // 1 second delay on startup
} as const

// Cache operation modes
export type CacheMode =
  | 'cache_first'
  | 'database_first'
  | 'cache_only'
  | 'database_only'

// Cache statistics interface
export interface CacheStats {
  hits: number
  misses: number
  errors: number
  lastUpdate: number
}

// Cache key utilities
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

// Cache patterns for different data types
export const CACHE_PATTERNS = {
  ROOM: {
    ttl: CACHE_TTL.ROOM_INDIVIDUAL,
    keyPattern: CACHE_KEYS.ROOM_BY_ID('*'),
    refreshThreshold: CACHE_SETTINGS.SYNC_THRESHOLD
  },

  ROOMS_LIST: {
    ttl: CACHE_TTL.ROOMS_ALL,
    keyPattern: CACHE_KEYS.ROOMS_ALL,
    refreshThreshold: CACHE_SETTINGS.SYNC_THRESHOLD
  }
} as const

// Environment-specific cache configuration
export const getCacheConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production'
  const isTest = process.env.NODE_ENV === 'test'

  return {
    enabled: !isTest, // Disable caching in tests
    ttlMultiplier: isProduction ? 1 : 0.1, // Shorter TTLs in development
    reconciliationEnabled:
      isProduction || process.env.ENABLE_ROOM_RECONCILIATION === 'true',
    warmCacheOnStartup: isProduction && CACHE_SETTINGS.WARM_CACHE_ON_STARTUP,
    backgroundRefreshEnabled:
      isProduction && CACHE_SETTINGS.BACKGROUND_REFRESH_ENABLED
  }
}
