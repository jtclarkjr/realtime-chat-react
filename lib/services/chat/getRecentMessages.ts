import { getServiceClient } from '@/lib/supabase/service-client'
import { userService } from '@/lib/services/user-service'
import type { DatabaseMessage, ChatMessageWithDB } from '@/lib/types/database'
import { transformDatabaseMessage } from './transformDatabaseMessage'
import { getUserDisplayName } from './getUserDisplayName'

export async function getRecentMessages(
  roomId: string,
  userId?: string,
  limit: number = 50
): Promise<ChatMessageWithDB[]> {
  const supabase = getServiceClient()

  try {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .is('deleted_at', null)

    // If userId is provided, filter private messages
    if (userId) {
      query = query.or(
        `is_private.eq.false,and(is_private.eq.true,requester_id.eq.${userId}),and(is_private.eq.true,user_id.eq.${userId})`
      )
    } else {
      // If no userId, only show public messages
      query = query.eq('is_private', false)
    }

    const { data: messages, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent messages:', error)
      return []
    }

    // Get unique user IDs for avatar fetching (exclude AI messages)
    const userIds = [
      ...new Set(
        (messages || [])
          .filter((msg) => !msg.is_ai_message)
          .map((msg) => msg.user_id)
      )
    ]

    // Fetch user profiles for avatars
    const userProfiles = await userService.getUserProfiles(userIds)

    return await Promise.all(
      (messages || []).reverse().map(async (msg: DatabaseMessage) => {
        const userProfile = userProfiles.get(msg.user_id)
        const userName = await getUserDisplayName(supabase, msg.user_id)
        return transformDatabaseMessage(msg, userProfile?.avatar_url, userName)
      })
    )
  } catch (error) {
    console.error('Error getting recent messages:', error)
    return []
  }
}
