import { getServiceClient } from '@/lib/supabase/service-client'
import { userService } from '@/lib/services/user-service'
import {
  markMessageReceived,
  trackLatestMessage,
  getUserLastReceivedMessageId,
  markUserCaughtUp
} from '@/lib/redis'
import type {
  DatabaseMessage,
  MissedMessagesResponse
} from '@/lib/types/database'
import { transformDatabaseMessage } from './transformDatabaseMessage'
import { getUserDisplayName } from './getUserDisplayName'
import { getMessageTimestamp } from './getMessageTimestamp'

export const getMissedMessages = async (
  userId: string,
  roomId: string
): Promise<MissedMessagesResponse> => {
  const supabase = getServiceClient()

  try {
    // Get user's last received message ID from Redis
    const lastReceivedId = await getUserLastReceivedMessageId(userId, roomId)

    if (!lastReceivedId) {
      // User is new or been away for 30+ days
      // Get recent messages from database (exclude private messages not for this user)
      const { data: recentMessages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .is('deleted_at', null)
        .or(
          `is_private.eq.false,and(is_private.eq.true,requester_id.eq.${userId}),and(is_private.eq.true,user_id.eq.${userId})`
        )
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching recent messages:', error)
        return { type: 'caught_up', messages: [], count: 0 }
      }

      // Mark user as caught up with the latest message BEFORE transformation
      if (recentMessages && recentMessages.length > 0) {
        // The most recent message is the first one since we ordered by created_at DESC
        const latestMessage = recentMessages[0]
        await trackLatestMessage(roomId, latestMessage.id)
        await markMessageReceived(userId, roomId, latestMessage.id)
      }

      // Get unique user IDs for avatar fetching (exclude AI messages)
      const userIds = [
        ...new Set(
          (recentMessages || [])
            .filter((msg) => !msg.is_ai_message)
            .map((msg) => msg.user_id)
        )
      ]

      // Fetch user profiles for avatars
      const userProfiles = await userService.getUserProfiles(userIds)

      // Transform and reverse to get chronological order
      const transformedMessages = await Promise.all(
        (recentMessages || []).reverse().map(async (msg: DatabaseMessage) => {
          const userProfile = userProfiles.get(msg.user_id)
          const userName = await getUserDisplayName(supabase, msg.user_id)
          return transformDatabaseMessage(
            msg,
            userProfile?.avatar_url,
            userName
          )
        })
      )

      return {
        type: transformedMessages.length > 0 ? 'missed_messages' : 'caught_up',
        messages: transformedMessages,
        count: transformedMessages.length
      }
    }

    // Get the timestamp of the last received message
    const lastMessageTimestamp = await getMessageTimestamp(
      supabase,
      lastReceivedId
    )

    // Get messages after their last received message (exclude private messages not for this user)
    const { data: missedMessages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .is('deleted_at', null)
      .gt('created_at', lastMessageTimestamp)
      .or(
        `is_private.eq.false,and(is_private.eq.true,requester_id.eq.${userId}),and(is_private.eq.true,user_id.eq.${userId})`
      )
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching missed messages:', error)
      return { type: 'caught_up', messages: [], count: 0 }
    }

    // Get unique user IDs for avatar fetching (exclude AI messages)
    const userIds = [
      ...new Set(
        (missedMessages || [])
          .filter((msg) => !msg.is_ai_message)
          .map((msg) => msg.user_id)
      )
    ]

    // Fetch user profiles for avatars
    const userProfiles = await userService.getUserProfiles(userIds)

    const transformedMessages = await Promise.all(
      (missedMessages || []).map(async (msg: DatabaseMessage) => {
        const userProfile = userProfiles.get(msg.user_id)
        const userName = await getUserDisplayName(supabase, msg.user_id)
        return transformDatabaseMessage(msg, userProfile?.avatar_url, userName)
      })
    )

    // Mark user as caught up
    await markUserCaughtUp(userId, roomId)

    // If no missed messages, get recent messages for context
    if (transformedMessages.length === 0) {
      const { data: recentMessages, error: recentError } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .is('deleted_at', null)
        .or(
          `is_private.eq.false,and(is_private.eq.true,requester_id.eq.${userId}),and(is_private.eq.true,user_id.eq.${userId})`
        )
        .order('created_at', { ascending: false })
        .limit(20) // Get last 20 messages for context

      if (!recentError && recentMessages && recentMessages.length > 0) {
        // Get unique user IDs for avatar fetching (exclude AI messages)
        const recentUserIds = [
          ...new Set(
            recentMessages
              .filter((msg) => !msg.is_ai_message)
              .map((msg) => msg.user_id)
          )
        ]

        // Fetch user profiles for avatars
        const recentUserProfiles =
          await userService.getUserProfiles(recentUserIds)

        const recentTransformed = await Promise.all(
          recentMessages.reverse().map(async (msg: DatabaseMessage) => {
            const userProfile = recentUserProfiles.get(msg.user_id)
            const userName = await getUserDisplayName(supabase, msg.user_id)
            return transformDatabaseMessage(
              msg,
              userProfile?.avatar_url,
              userName
            )
          })
        )

        return {
          type: 'recent_messages',
          messages: recentTransformed,
          count: recentTransformed.length
        }
      }
    }

    return {
      type: transformedMessages.length > 0 ? 'missed_messages' : 'caught_up',
      messages: transformedMessages,
      count: transformedMessages.length
    }
  } catch (error) {
    console.error('Error getting missed messages:', error)
    return { type: 'caught_up', messages: [], count: 0 }
  }
}
