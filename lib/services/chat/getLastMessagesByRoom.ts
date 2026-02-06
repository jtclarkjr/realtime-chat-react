import {
  fetchLatestMessageForRoom,
  fetchLatestMessagesByRoomBatch,
  getUserDisplayNameById
} from '@/lib/supabase/db/chat'
import { getServiceClient } from '@/lib/supabase/server'
import type { LatestVisibleMessage } from '@/lib/types/database'

export interface RoomLastMessage {
  content: string
  timestamp: string
  userName: string
  isAI: boolean
}

export const getLastMessagesByRoom = async (
  roomIds: string[],
  userId?: string
): Promise<Map<string, RoomLastMessage>> => {
  if (roomIds.length === 0) {
    return new Map()
  }

  const latestByRoom = new Map<
    string,
    Pick<
      LatestVisibleMessage,
      'room_id' | 'content' | 'created_at' | 'user_id' | 'is_ai_message'
    >
  >()

  // First pass: paged global query (bounded) to avoid unbounded scans.
  const batchSize = Math.min(Math.max(roomIds.length * 4, 100), 500)
  const maxBatches = 5
  let offset = 0

  for (let i = 0; i < maxBatches; i++) {
    try {
      const rows = await fetchLatestMessagesByRoomBatch(
        roomIds,
        userId,
        offset,
        batchSize
      )

      for (const message of rows) {
        if (!latestByRoom.has(message.room_id)) {
          latestByRoom.set(message.room_id, message)
        }
      }

      if (latestByRoom.size >= roomIds.length || rows.length < batchSize) {
        break
      }

      offset += rows.length
    } catch (error) {
      console.error('Error fetching last messages by room:', error)
      break
    }
  }

  // Fallback for rooms not found in bounded pass: fetch 1 row per missing room.
  const missingRoomIds = roomIds.filter((roomId) => !latestByRoom.has(roomId))
  if (missingRoomIds.length > 0) {
    const perRoomResults = await Promise.all(
      missingRoomIds.map(async (roomId) => {
        try {
          return await fetchLatestMessageForRoom(roomId, userId)
        } catch (error) {
          console.error(
            `Error fetching last message for room ${roomId}:`,
            error
          )
          return null
        }
      })
    )

    for (const row of perRoomResults) {
      if (row && !latestByRoom.has(row.room_id)) {
        latestByRoom.set(row.room_id, row)
      }
    }
  }

  const uniqueUserIds = [
    ...new Set(Array.from(latestByRoom.values()).map((msg) => msg.user_id))
  ]
  const supabase = getServiceClient()
  const userNameEntries = await Promise.all(
    uniqueUserIds.map(
      async (id): Promise<readonly [string, string]> => [
        id,
        await getUserDisplayNameById(supabase, id)
      ]
    )
  )
  const userNameById = new Map<string, string>(userNameEntries)

  const results = new Map<string, RoomLastMessage>()
  for (const [roomId, lastMsg] of latestByRoom.entries()) {
    results.set(roomId, {
      content: lastMsg.content,
      timestamp: lastMsg.created_at,
      userName: userNameById.get(lastMsg.user_id) || 'Unknown User',
      isAI: lastMsg.is_ai_message || false
    })
  }

  return results
}
