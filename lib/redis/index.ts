// Client exports
export { getRedisClient, disconnectRedis } from './client'
export type { RedisLike } from './client/types'

// Cache exports
export {
  CACHE_TTL,
  CACHE_KEYS,
  CACHE_SETTINGS,
  getCacheConfig,
  CacheUtils
} from './cache'

export type { CacheMode, CacheStats, CacheConfig } from './cache/types'

// Message tracking exports
export {
  markMessageReceived,
  trackLatestMessage,
  getUserLastReceivedMessageId,
  getRoomLatestMessageId,
  markUserCaughtUp,
  getUserLastReceivedKey,
  getRoomLatestMessageKey
} from './message-tracking'

export type {
  MessageTrackingKeys,
  MessageTrackingOperations
} from './message-tracking/types'
