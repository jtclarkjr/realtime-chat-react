/**
 * Cache operation modes
 */
export type CacheMode =
  | 'cache_first'
  | 'database_first'
  | 'cache_only'
  | 'database_only'

/**
 * Cache statistics interface
 */
export interface CacheStats {
  hits: number
  misses: number
  errors: number
  lastUpdate: number
}

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  enabled: boolean
  ttlMultiplier: number
  reconciliationEnabled: boolean
  warmCacheOnStartup: boolean
  backgroundRefreshEnabled: boolean
}
