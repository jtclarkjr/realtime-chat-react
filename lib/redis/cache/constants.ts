/**
 * Cache TTL constants (in seconds)
 */
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

/**
 * Cache key patterns
 */
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

/**
 * Cache operation settings
 */
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
