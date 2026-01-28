import { getServiceClient } from '@/lib/supabase/service-client'

interface UserProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export class UserService {
  private supabase = getServiceClient()
  private userCache = new Map<string, UserProfile>()
  private cacheTTL = 5 * 60 * 1000 // 5 minutes
  private cacheTimestamps = new Map<string, number>()

  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    // Check cache first
    const cached = this.getCachedUser(userId)
    if (cached) {
      return cached
    }

    try {
      // Use admin client to get user metadata
      const { data: user, error } =
        await this.supabase.auth.admin.getUserById(userId)

      if (!error && user.user) {
        const profile: UserProfile = {
          id: user.user.id,
          full_name: user.user.user_metadata?.full_name || null,
          avatar_url: user.user.user_metadata?.avatar_url || null
        }

        // Cache the result
        this.cacheUser(userId, profile)
        return profile
      }

      if (error) {
        // Only log non-JWT errors, or all errors in production
        const isJWTError =
          error.message?.includes('invalid JWT') ||
          error.message?.includes('bad_jwt')
        const shouldLog = !isJWTError || process.env.NODE_ENV !== 'development'

        if (shouldLog) {
          console.warn(`Could not fetch user profile for ${userId}:`, error)
        }
      }

      // Return null - avatar is optional, we already have username from get_user_display_name
      return null
    } catch (error) {
      // Don't log error if it's a JWT issue in local dev - it's expected
      if (
        !(error instanceof Error && error.message?.includes('invalid JWT')) ||
        process.env.NODE_ENV !== 'development'
      ) {
        console.error('Error fetching user profile:', error)
      }
      return null
    }
  }

  /**
   * Get multiple user profiles by user IDs
   */
  async getUserProfiles(userIds: string[]): Promise<Map<string, UserProfile>> {
    const profiles = new Map<string, UserProfile>()
    const uncachedIds: string[] = []

    // Check cache first
    for (const userId of userIds) {
      const cached = this.getCachedUser(userId)
      if (cached) {
        profiles.set(userId, cached)
      } else {
        uncachedIds.push(userId)
      }
    }

    // Fetch uncached users
    if (uncachedIds.length > 0) {
      try {
        // Note: Supabase admin doesn't have batch user fetch, so we need to fetch individually
        const fetchPromises = uncachedIds.map((userId) =>
          this.getUserProfile(userId)
        )
        const fetchedProfiles = await Promise.all(fetchPromises)

        fetchedProfiles.forEach((profile, index) => {
          if (profile) {
            profiles.set(uncachedIds[index], profile)
          }
        })
      } catch (error) {
        console.error('Error fetching user profiles batch:', error)
      }
    }

    return profiles
  }

  /**
   * Get cached user if available and not expired
   */
  private getCachedUser(userId: string): UserProfile | null {
    const cached = this.userCache.get(userId)
    const timestamp = this.cacheTimestamps.get(userId)

    if (cached && timestamp && Date.now() - timestamp < this.cacheTTL) {
      return cached
    }

    // Remove expired cache entry
    this.userCache.delete(userId)
    this.cacheTimestamps.delete(userId)
    return null
  }

  /**
   * Cache user profile
   */
  private cacheUser(userId: string, profile: UserProfile): void {
    this.userCache.set(userId, profile)
    this.cacheTimestamps.set(userId, Date.now())
  }

  /**
   * Clear cache for a specific user (useful for profile updates)
   */
  clearUserCache(userId: string): void {
    this.userCache.delete(userId)
    this.cacheTimestamps.delete(userId)
  }

  /**
   * Clear entire cache
   */
  clearAllCache(): void {
    this.userCache.clear()
    this.cacheTimestamps.clear()
  }
}

// Export a singleton instance
export const userService = new UserService()
