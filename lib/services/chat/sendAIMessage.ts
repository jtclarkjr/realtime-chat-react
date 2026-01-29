import { getServiceClient } from '@/lib/supabase/service-client'
import { AI_USER_ID } from '@/lib/services/ai-user-setup'
import { trackLatestMessage } from '@/lib/redis'
import type {
  DatabaseMessageInsert,
  ChatMessageWithDB,
  SendAIMessageRequest
} from '@/lib/types/database'
import { transformDatabaseMessage } from './transformDatabaseMessage'
import { getUserDisplayName } from './getUserDisplayName'

export const sendAIMessage = async (
  request: SendAIMessageRequest
): Promise<ChatMessageWithDB> => {
  // Validate required fields
  if (!request.roomId || !request.content?.trim()) {
    throw new Error('Missing required fields for AI message')
  }

  // Ensure AI_USER_ID is available
  if (!AI_USER_ID) {
    throw new Error('AI_USER_ID is not configured')
  }

  const supabase = getServiceClient()

  // Save AI message to database
  const aiMessageInsert: DatabaseMessageInsert = {
    room_id: request.roomId,
    user_id: AI_USER_ID,
    content: request.content,
    is_ai_message: true,
    is_private: request.isPrivate || false,
    requester_id: request.isPrivate ? request.requesterId : null
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert(aiMessageInsert)
    .select()
    .single()

  if (error) {
    console.error('Error saving AI message to database:', error)
    throw new Error('Failed to save AI message')
  }

  // For AI messages, use a stable fallback if no display name is set
  let aiUserName = await getUserDisplayName(supabase, AI_USER_ID)
  if (!aiUserName || aiUserName === 'Unknown User') {
    aiUserName = 'AI Assistant'
  }

  // Track this as the latest message in Redis
  await trackLatestMessage(request.roomId, message.id)

  return transformDatabaseMessage(message, null, aiUserName)
}
