import { roomCacheService } from './room-cache-service'
import { getServiceClient } from '@/lib/supabase/server'
import type { DatabaseRoom } from '@/lib/types/database'

export class RoomReconciliationService {
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null

  // Reconciliation interval (every 5 minutes)
  private readonly RECONCILIATION_INTERVAL = 5 * 60 * 1000

  /**
   * Start the reconciliation service
   */
  start(): void {
    if (this.isRunning) {
      console.log('Room reconciliation service is already running')
      return
    }

    this.isRunning = true
    console.log('Starting room reconciliation service...')

    // Run initial reconciliation
    this.reconcile().catch(console.error)

    // Set up periodic reconciliation
    this.intervalId = setInterval(() => {
      this.reconcile().catch(console.error)
    }, this.RECONCILIATION_INTERVAL)
  }

  /**
   * Stop the reconciliation service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('Room reconciliation service stopped')
  }

  /**
   * Check if the service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning
  }

  /**
   * Manual reconciliation trigger
   */
  async reconcileNow(): Promise<void> {
    await this.reconcile()
  }

  /**
   * Perform cache reconciliation with database
   */
  private async reconcile(): Promise<void> {
    try {
      // Check if reconciliation is needed
      const needsReconciliation = await roomCacheService.needsReconciliation()

      if (!needsReconciliation) {
        return
      }

      console.log('Starting room cache reconciliation...')

      // Get fresh data from database
      const dbRooms = await this.getLatestRoomsFromDatabase()

      // Get cached data
      const cachedRooms = await this.getCachedRooms()

      // Compare and sync if needed
      const changes = this.detectChanges(cachedRooms, dbRooms)

      if (changes.hasChanges) {
        console.log(`Reconciliation detected changes: ${changes.summary}`)
        await roomCacheService.reconcileWithDatabase()
        console.log('Room cache reconciliation completed')
      } else {
        console.log('No changes detected during reconciliation')
      }
    } catch (error) {
      console.error('Error during room cache reconciliation:', error)
    }
  }

  /**
   * Get latest rooms directly from database
   */
  private async getLatestRoomsFromDatabase(): Promise<DatabaseRoom[]> {
    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching rooms from database:', error)
      throw new Error('Failed to fetch rooms from database')
    }

    return data || []
  }

  /**
   * Get cached rooms (with fallback handling)
   */
  private async getCachedRooms(): Promise<DatabaseRoom[]> {
    try {
      return await roomCacheService.getAllRooms()
    } catch (error) {
      console.error('Error getting cached rooms:', error)
      return []
    }
  }

  /**
   * Detect changes between cached and database rooms
   */
  private detectChanges(
    cachedRooms: DatabaseRoom[],
    dbRooms: DatabaseRoom[]
  ): {
    hasChanges: boolean
    summary: string
    added: DatabaseRoom[]
    removed: DatabaseRoom[]
    modified: DatabaseRoom[]
  } {
    const result = {
      hasChanges: false,
      summary: '',
      added: [] as DatabaseRoom[],
      removed: [] as DatabaseRoom[],
      modified: [] as DatabaseRoom[]
    }

    // Create maps for easier comparison
    const cachedMap = new Map(cachedRooms.map((room) => [room.id, room]))
    const dbMap = new Map(dbRooms.map((room) => [room.id, room]))

    // Find added rooms (in DB but not in cache)
    for (const dbRoom of dbRooms) {
      if (!cachedMap.has(dbRoom.id)) {
        result.added.push(dbRoom)
      }
    }

    // Find removed rooms (in cache but not in DB)
    for (const cachedRoom of cachedRooms) {
      if (!dbMap.has(cachedRoom.id)) {
        result.removed.push(cachedRoom)
      }
    }

    // Find modified rooms (different data)
    for (const dbRoom of dbRooms) {
      const cachedRoom = cachedMap.get(dbRoom.id)
      if (cachedRoom && this.isRoomModified(cachedRoom, dbRoom)) {
        result.modified.push(dbRoom)
      }
    }

    result.hasChanges =
      result.added.length > 0 ||
      result.removed.length > 0 ||
      result.modified.length > 0

    if (result.hasChanges) {
      const parts = []
      if (result.added.length > 0) parts.push(`${result.added.length} added`)
      if (result.removed.length > 0)
        parts.push(`${result.removed.length} removed`)
      if (result.modified.length > 0)
        parts.push(`${result.modified.length} modified`)
      result.summary = parts.join(', ')
    }

    return result
  }

  /**
   * Check if a room has been modified
   */
  private isRoomModified(
    cachedRoom: DatabaseRoom,
    dbRoom: DatabaseRoom
  ): boolean {
    // Compare key fields that might change
    return (
      cachedRoom.name !== dbRoom.name ||
      cachedRoom.description !== dbRoom.description ||
      new Date(cachedRoom.created_at).getTime() !==
        new Date(dbRoom.created_at).getTime()
    )
  }

  /**
   * Get reconciliation status
   */
  async getReconciliationStatus(): Promise<{
    isRunning: boolean
    lastReconciliation: Date | null
    needsReconciliation: boolean
  }> {
    const needsReconciliation = await roomCacheService.needsReconciliation()

    return {
      isRunning: this.isRunning,
      lastReconciliation: null, // Could be enhanced to track this
      needsReconciliation
    }
  }
}

// Export singleton instance
export const roomReconciliationService = new RoomReconciliationService()

// Auto-start the service in server environments
if (typeof window === 'undefined') {
  // Only start when explicitly enabled
  if (process.env.ENABLE_ROOM_RECONCILIATION === 'true') {
    setTimeout(() => {
      roomReconciliationService.start()
    }, 1000) // Small delay to ensure other services are ready
  }
}
