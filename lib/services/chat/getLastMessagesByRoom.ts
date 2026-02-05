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

  let query = supabase
    .from('messages')
    .select(
      'room_id, content, created_at, user_id, is_ai_message, is_private, requester_id, deleted_at'
    )
    .in('room_id', roomIds)
    .is('deleted_at', null)

  if (userId) {
    query = query.or(
      `is_private.eq.false,and(is_private.eq.true,requester_id.eq.${userId}),and(is_private.eq.true,user_id.eq.${userId})`
    )
  } else {
    query = query.eq('is_private', false)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) {
    console.error('Error fetching last messages by room:', error)
    return new Map()
  }

  const latestByRoom = new Map<
    string,
    Pick<
      DatabaseMessage,
      'room_id' | 'content' | 'created_at' | 'user_id' | 'is_ai_message'
    >
  >()

  for (const message of data || []) {
    if (!latestByRoom.has(message.room_id)) {
      latestByRoom.set(message.room_id, message)
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
