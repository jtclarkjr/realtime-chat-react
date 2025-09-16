import { CacheConfig } from './types'
import { CACHE_SETTINGS } from './constants'

/**
 * Environment-specific cache configuration
 */
export const getCacheConfig = (): CacheConfig => {
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
