import type { DatabaseMessage, ChatMessageWithDB } from '@/lib/types/database'

export function transformDatabaseMessage(
  dbMessage: DatabaseMessage,
  userAvatar?: string | null,
  userName?: string
): ChatMessageWithDB {
  return {
    id: dbMessage.id,
    content: dbMessage.content,
    user: {
      id: dbMessage.user_id,
      name: userName || 'Unknown User',
      avatar_url: userAvatar || undefined
    },
    createdAt: dbMessage.created_at,
    channelId: dbMessage.room_id,
    // Add privacy and AI information
    isAI: dbMessage.is_ai_message || false,
    isPrivate: dbMessage.is_private || false,
    requesterId: dbMessage.is_private
      ? dbMessage.requester_id || dbMessage.user_id
      : undefined,
    // Add soft delete information
    isDeleted: !!dbMessage.deleted_at,
    deletedAt: dbMessage.deleted_at || undefined,
    deletedBy: dbMessage.deleted_by || undefined,
    // Add AI response tracking
    hasAIResponse: dbMessage.has_ai_response || false
  }
}
