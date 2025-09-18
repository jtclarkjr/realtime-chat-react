import { getServiceClient } from '@/lib/supabase/service-client'
import {
  markMessageReceived,
  trackLatestMessage,
  getUserLastReceivedMessageId,
  markUserCaughtUp
} from '@/lib/redis'
import type {
  DatabaseMessage,
  ChatMessageWithDB,
  MissedMessagesResponse,
  SendMessageRequest,
  SendAIMessageRequest
} from '@/lib/types/database'

export class ChatService {
  private supabase = getServiceClient()

  /**
   * Transform database message to chat message format
   */
  private transformDatabaseMessage(
    dbMessage: DatabaseMessage
  ): ChatMessageWithDB {
    return {
      id: dbMessage.id,
      content: dbMessage.content,
      user: {
        id: dbMessage.user_id,
        name: dbMessage.username
      },
      createdAt: dbMessage.created_at,
      channelId: dbMessage.room_id,
      // Add privacy and AI information
      isAI: dbMessage.is_ai_message || false,
      isPrivate: dbMessage.is_private || false,
      requesterId: dbMessage.is_private ? dbMessage.user_id : undefined
    }
  }

  /**
   * Send a message and persist it to database
   */
  async sendMessage(request: SendMessageRequest): Promise<ChatMessageWithDB> {
    // Save to database (id will be auto-generated)
    const { data: message, error } = await this.supabase
      .from('messages')
      .insert({
        room_id: request.roomId,
        user_id: request.userId,
        username: request.username,
        content: request.content,
        is_ai_message: false,
        is_private: request.isPrivate || false
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving message to database:', error)
      throw new Error('Failed to save message')
    }

    // Track this as the latest message in Redis
    await trackLatestMessage(request.roomId, message.id)

    return this.transformDatabaseMessage(message)
  }

  /**
   * Send an AI message and persist it to database
   */
  async sendAIMessage(
    request: SendAIMessageRequest
  ): Promise<ChatMessageWithDB> {
    // Save AI message to database
    const { data: message, error } = await this.supabase
      .from('messages')
      .insert({
        room_id: request.roomId,
        user_id: request.isPrivate
          ? request.requesterId || 'ai-assistant'
          : 'ai-assistant',
        username: 'AI Assistant',
        content: request.content,
        is_ai_message: true,
        is_private: request.isPrivate || false
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving AI message to database:', error)
      throw new Error('Failed to save AI message')
    }

    // Track this as the latest message in Redis
    await trackLatestMessage(request.roomId, message.id)

    return this.transformDatabaseMessage(message)
  }

  /**
   * Get missed messages for a user when they rejoin a room
   */
  async getMissedMessages(
    userId: string,
    roomId: string
  ): Promise<MissedMessagesResponse> {
    try {
      // Get user's last received message ID from Redis
      const lastReceivedId = await getUserLastReceivedMessageId(userId, roomId)

      if (!lastReceivedId) {
        // User is new or been away for 30+ days
        // Get recent messages from database (exclude private messages not for this user)
        const { data: recentMessages, error } = await this.supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .or(
            `is_private.eq.false,and(is_private.eq.true,user_id.eq.${userId})`
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

        // Transform and reverse to get chronological order
        const transformedMessages = (recentMessages || [])
          .reverse()
          .map((msg: DatabaseMessage) => this.transformDatabaseMessage(msg))

        return {
          type:
            transformedMessages.length > 0 ? 'missed_messages' : 'caught_up',
          messages: transformedMessages,
          count: transformedMessages.length
        }
      }

      // Get the timestamp of the last received message
      const lastMessageTimestamp =
        await this.getMessageTimestamp(lastReceivedId)

      // Get messages after their last received message (exclude private messages not for this user)
      const { data: missedMessages, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .gt('created_at', lastMessageTimestamp)
        .or(`is_private.eq.false,and(is_private.eq.true,user_id.eq.${userId})`)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching missed messages:', error)
        return { type: 'caught_up', messages: [], count: 0 }
      }

      const transformedMessages = (missedMessages || []).map(
        (msg: DatabaseMessage) => this.transformDatabaseMessage(msg)
      )

      // Mark user as caught up
      await markUserCaughtUp(userId, roomId)

      // If no missed messages, get recent messages for context
      if (transformedMessages.length === 0) {
        const { data: recentMessages, error: recentError } = await this.supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .or(
            `is_private.eq.false,and(is_private.eq.true,user_id.eq.${userId})`
          )
          .order('created_at', { ascending: false })
          .limit(20) // Get last 20 messages for context

        if (!recentError && recentMessages && recentMessages.length > 0) {
          const recentTransformed = recentMessages
            .reverse()
            .map((msg: DatabaseMessage) => this.transformDatabaseMessage(msg))

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

  /**
   * Mark a message as received by a user
   */
  async markAsReceived(
    userId: string,
    roomId: string,
    messageId: string
  ): Promise<void> {
    try {
      await markMessageReceived(userId, roomId, messageId)
    } catch (error) {
      console.error('Error marking message as received:', error)
      // Don't throw - this is not critical for user experience
    }
  }

  /**
   * Get message timestamp by ID (helper method)
   */
  private async getMessageTimestamp(messageId: string): Promise<string> {
    const { data: message } = await this.supabase
      .from('messages')
      .select('created_at')
      .eq('id', messageId)
      .single()

    return message?.created_at || new Date(0).toISOString()
  }

  /**
   * Get recent messages for initial load
   */
  async getRecentMessages(
    roomId: string,
    userId?: string,
    limit: number = 50
  ): Promise<ChatMessageWithDB[]> {
    try {
      let query = this.supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)

      // If userId is provided, filter private messages
      if (userId) {
        query = query.or(
          `is_private.eq.false,and(is_private.eq.true,user_id.eq.${userId})`
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

      return (messages || [])
        .reverse()
        .map((msg: DatabaseMessage) => this.transformDatabaseMessage(msg))
    } catch (error) {
      console.error('Error getting recent messages:', error)
      return []
    }
  }
}
