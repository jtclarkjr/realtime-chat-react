'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { roomCacheService } from '@/lib/services/room/room-cache-service'
import {
  ensureDefaultRooms,
  getRoomById,
  getRooms
} from '@/lib/supabase/db/rooms'
import type { DatabaseRoom, ChatMessageWithDB } from '@/lib/types/database'
import { getRecentMessages, getLastMessagesByRoom } from '@/lib/services/chat'
import { isAnonymousUser } from '@/lib/auth/middleware'
import { getAuthenticatedUser } from '@/lib/auth/server-user'

/**
 * Server action to get initial rooms data for SSR
 * This will be called during server rendering to pre-populate room data
 */
export async function getInitialRoomsData(): Promise<{
  rooms: DatabaseRoom[]
  defaultRoomId: string | null
}> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return {
        rooms: [],
        defaultRoomId: null
      }
    }

    // Ensure default rooms exist before fetching
    await ensureDefaultRooms()

    // Always read fresh rooms for SSR request
    const rooms = await getRooms()

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
}

/**
 * Server action to get a specific room by ID
 */
export async function getRoomByIdAction(
  roomId: string
): Promise<DatabaseRoom | null> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return null

    return await getRoomById(roomId)
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

    // Get authenticated user
    const user = await getAuthenticatedUser()
    if (!user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    if (isAnonymousUser(user)) {
      return {
        success: false,
        error: 'Anonymous users cannot create rooms. Please sign in.'
      }
    }

    const room = await roomCacheService.createRoom({
      name: name.trim(),
      description: description || null,
      created_by: user.id
    })

    // Revalidate the home page to refresh SSR data
    revalidatePath('/')
    // Also revalidate any pages that might cache room data
    revalidateTag('rooms', 'default')

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

/**
 * Server action to get initial room data with messages for the /room route
 * This includes room details and recent messages for immediate display
 *
 * IMPORTANT: We don't cache messages here because the system needs to
 * respect the missed message tracking system for each user individually
 */
export async function getRoomDataWithMessages(roomId: string): Promise<{
  room: DatabaseRoom | null
  messages: ChatMessageWithDB[]
}> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return {
        room: null,
        messages: []
      }
    }

    // Always read fresh room details for each request.
    const room = await getRoomById(roomId)

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
    const messages = await getRecentMessages(roomId, user.id, 50)

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
 * Server action to delete a room
 */
export async function deleteRoomAction(roomId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    if (!roomId || typeof roomId !== 'string') {
      return {
        success: false,
        error: 'Room ID is required'
      }
    }

    // Get authenticated user
    const user = await getAuthenticatedUser()
    if (!user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    if (isAnonymousUser(user)) {
      return {
        success: false,
        error: 'Anonymous users cannot delete rooms. Please sign in.'
      }
    }

    const success = await roomCacheService.deleteRoom(roomId, user.id)

    if (!success) {
      return {
        success: false,
        error: 'Room not found or unauthorized to delete'
      }
    }

    // Revalidate the home page to refresh SSR data
    revalidatePath('/')
    // Also revalidate any pages that might cache room data
    revalidateTag('rooms', 'default')

    return {
      success: true
    }
  } catch (error) {
    console.error('Error deleting room:', error)

    // Handle specific errors
    if (error instanceof Error && error.message.includes('unauthorized')) {
      return {
        success: false,
        error: 'Unauthorized to delete this room'
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete room'
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

/**
 * Extended room type with last message info
 */
export interface RoomWithLastMessage extends DatabaseRoom {
  lastMessage?: {
    content: string
    timestamp: string
    userName: string
    isAI: boolean
  }
}

/**
 * Server action to get rooms with their last message for the dashboard
 */
export async function getRoomsWithLastMessage(): Promise<
  RoomWithLastMessage[]
> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return []

    const { rooms } = await getInitialRoomsData()
    if (rooms.length === 0) return []

    const roomIds = rooms.map((room) => room.id)
    const latestByRoom = await getLastMessagesByRoom(roomIds, user.id)

    const roomsWithMessages = rooms.map((room) => {
      const lastMsg = latestByRoom.get(room.id)
      if (!lastMsg) return room

      return {
        ...room,
        lastMessage: {
          content: lastMsg.content,
          timestamp: lastMsg.timestamp,
          userName: lastMsg.userName,
          isAI: lastMsg.isAI
        }
      }
    })

    return roomsWithMessages
  } catch (error) {
    console.error('Error fetching rooms with last messages:', error)
    return []
  }
}
