import { getServiceClient } from '@/lib/supabase/service-client'
import type { DatabaseMessage } from '@/lib/types/database'
import { getUserDisplayName } from './getUserDisplayName'

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

  const supabase = getServiceClient()

  const latestByRoom = new Map<
    string,
    Pick<
      DatabaseMessage,
      'room_id' | 'content' | 'created_at' | 'user_id' | 'is_ai_message'
    >
  >()

  const applyVisibilityFilter = (query: ReturnType<typeof supabase.from>) => {
    if (userId) {
      return query.or(
        `is_private.eq.false,and(is_private.eq.true,requester_id.eq.${userId}),and(is_private.eq.true,user_id.eq.${userId})`
      )
    }
    return query.eq('is_private', false)
  }

  // First pass: paged global query (bounded) to avoid unbounded scans.
  const batchSize = Math.min(Math.max(roomIds.length * 4, 100), 500)
  const maxBatches = 5
  let offset = 0

  for (let i = 0; i < maxBatches; i++) {
    let query = supabase
      .from('messages')
      .select(
        'room_id, content, created_at, user_id, is_ai_message, is_private, requester_id, deleted_at'
      )
      .in('room_id', roomIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + batchSize - 1)

    query = applyVisibilityFilter(query)

    const { data, error } = await query
    if (error) {
      console.error('Error fetching last messages by room:', error)
      break
    }

    const rows = data || []
    for (const message of rows) {
      if (!latestByRoom.has(message.room_id)) {
        latestByRoom.set(message.room_id, message)
      }
    }

    if (latestByRoom.size >= roomIds.length || rows.length < batchSize) {
      break
    }

    offset += rows.length
  }

  // Fallback for rooms not found in bounded pass: fetch 1 row per missing room.
  const missingRoomIds = roomIds.filter((roomId) => !latestByRoom.has(roomId))
  if (missingRoomIds.length > 0) {
    const perRoomResults = await Promise.all(
      missingRoomIds.map(async (roomId) => {
        let query = supabase
          .from('messages')
          .select(
            'room_id, content, created_at, user_id, is_ai_message, is_private, requester_id, deleted_at'
          )
          .eq('room_id', roomId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)

        query = applyVisibilityFilter(query)
        const { data, error } = await query
        if (error) {
          console.error(
            `Error fetching last message for room ${roomId}:`,
            error
          )
          return null
        }
        return data?.[0] || null
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
  const userNameEntries = await Promise.all(
    uniqueUserIds.map(
      async (id): Promise<readonly [string, string]> => [
        id,
        await getUserDisplayName(supabase, id)
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
