import { getServiceClient } from '@/lib/supabase/service-client'
import { userService } from '@/lib/services/user-service'
import { trackLatestMessage } from '@/lib/redis'
import type {
  DatabaseMessageInsert,
  ChatMessageWithDB,
  SendMessageRequest
} from '@/lib/types/database'
import { transformDatabaseMessage } from './transformDatabaseMessage'
import { getUserDisplayName } from './getUserDisplayName'

export async function sendMessage(
  request: SendMessageRequest
): Promise<ChatMessageWithDB> {
  // Validate required fields
  if (!request.roomId || !request.userId || !request.content?.trim()) {
    throw new Error('Missing required fields for message')
  }

  const supabase = getServiceClient()

  // Save to database (id will be auto-generated)
  const messageInsert: DatabaseMessageInsert = {
    room_id: request.roomId,
    user_id: request.userId,
    content: request.content,
    is_ai_message: false,
    is_private: request.isPrivate || false
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert(messageInsert)
    .select()
    .single()

  if (error) {
    console.error('Error saving message to database:', error)
    throw new Error('Failed to save message')
  }

  // Get username from auth.users
  const userName = await getUserDisplayName(supabase, message.user_id)

  // Get user avatar if available
  const userProfile = await userService.getUserProfile(message.user_id)

  // Track this as the latest message in Redis
  await trackLatestMessage(request.roomId, message.id)

  return transformDatabaseMessage(
    message,
    userProfile?.avatar_url,
    userName
  )
}
