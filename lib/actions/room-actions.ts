'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { unstable_cache } from 'next/cache'
import { roomCacheService } from '@/lib/services/room-cache-service'
import { ensureDefaultRooms } from '@/lib/supabase/rooms'
import type { DatabaseRoom, ChatMessageWithDB } from '@/lib/types/database'
import { ChatService } from '@/lib/services/chat-service'

/**
 * Server action to get initial rooms data for SSR
 * This will be called during server rendering to pre-populate room data
 */
// Create cached version of room data fetching
const getCachedRoomsData = unstable_cache(
  async () => {
    try {
      // Ensure default rooms exist before fetching
      await ensureDefaultRooms()

      // Get all rooms from cache (with database fallback)
      const rooms = await roomCacheService.getAllRooms()

      // Find the default room (prefer 'general' room)
      let defaultRoomId: string | null = null
      if (rooms.length > 0) {
        const generalRoom = rooms.find((room) => room.name === 'general')
        defaultRoomId = generalRoom?.id || rooms[0].id
      }

      return {
        rooms,
        defaultRoomId
      }
    } catch (error) {
      console.error('Error fetching initial rooms data:', error)
      return {
        rooms: [],
        defaultRoomId: null
      }
    }
  },
  ['rooms-data'], // cache key
  {
    revalidate: 30, // Cache for 30 seconds
    tags: ['rooms'] // Allow targeted revalidation
  }
)

export async function getInitialRoomsData(): Promise<{
  rooms: DatabaseRoom[]
  defaultRoomId: string | null
}> {
  return getCachedRoomsData()
}

/**
 * Server action to get a specific room by ID
 */
export async function getRoomByIdAction(
  roomId: string
): Promise<DatabaseRoom | null> {
  try {
    return await roomCacheService.getRoomById(roomId)
  } catch (error) {
    console.error('Error fetching room by ID:', error)
    return null
  }
}

/**
 * Server action to create a new room
 */
export async function createRoomAction(
  name: string,
  description?: string
): Promise<{
  success: boolean
  room?: DatabaseRoom
  error?: string
}> {
  try {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return {
        success: false,
        error: 'Room name is required'
      }
    }

    const room = await roomCacheService.createRoom({
      name: name.trim(),
      description: description || null
    })

    // Revalidate the home page to refresh SSR data
    revalidatePath('/')
    // Also revalidate any pages that might cache room data
    revalidateTag('rooms')

    return {
      success: true,
      room
    }
  } catch (error) {
    console.error('Error creating room:', error)

    // Handle specific database errors
    if (
      error instanceof Error &&
      (error.message.includes('duplicate key') ||
        error.message.includes('unique constraint') ||
        error.message.includes('already exists'))
    ) {
      return {
        success: false,
        error: error.message.includes('already exists') 
          ? error.message 
          : 'A room with this name already exists'
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create room'
    }
  }
}

// Create cached version of room data (room info only, not messages)
const getCachedRoomData = unstable_cache(
  async (roomId: string) => {
    try {
      // Only cache room details, NOT messages
      const room = await roomCacheService.getRoomById(roomId)
      return room
    } catch (error) {
      console.error('Error fetching room data:', error)
      return null
    }
  },
  ['room-data'], // cache key base
  {
    revalidate: 300, // Cache room data for 5 minutes (changes rarely)
    tags: ['rooms'] // Allow targeted revalidation
  }
)

/**
 * Server action to get initial room data with messages for the /room route
 * This includes room details and recent messages for immediate display
 *
 * IMPORTANT: We don't cache messages here because the system needs to
 * respect the missed message tracking system for each user individually
 */
export async function getRoomDataWithMessages(
  roomId: string,
  userId?: string
): Promise<{
  room: DatabaseRoom | null
  messages: ChatMessageWithDB[]
}> {
  try {
    const chatService = new ChatService()

    // Get room details (cached)
    const room = await getCachedRoomData(roomId)

    if (!room) {
      return {
        room: null,
        messages: []
      }
    }

    // Get recent messages with user context for privacy filtering
    // (NOT cached - each user needs fresh data for missed message tracking)
    // This ensures the missed message system works correctly when users rejoin
    // AND respects private message visibility
    const messages = await chatService.getRecentMessages(roomId, userId, 50)

    return {
      room,
      messages
    }
  } catch (error) {
    console.error('Error fetching room data with messages:', error)
    return {
      room: null,
      messages: []
    }
  }
}

/**
 * Server action to warm the room cache
 * Useful for background cache warming
 */
export async function warmRoomCacheAction(): Promise<void> {
  try {
    await roomCacheService.warmCache()
  } catch (error) {
    console.error('Error warming room cache:', error)
  }
}
