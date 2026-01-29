import type {
  ChatMessageWithDB,
  UnsendMessageRequest,
  SupabaseServerClient
} from '@/lib/types/database'
import { transformDatabaseMessage } from './transformDatabaseMessage'
import { getUserDisplayName } from './getUserDisplayName'

export async function unsendMessage(
  request: UnsendMessageRequest,
  authenticatedClient: SupabaseServerClient
): Promise<ChatMessageWithDB> {
  if (!request.messageId || !request.userId || !request.roomId) {
    throw new Error('Missing required fields for unsend message')
  }

  // Soft delete by setting deleted_at and deleted_by
  // Let the database set the timestamp using NOW()
  const { data: updatedMessage, error: updateError } =
    await authenticatedClient
      .from('messages')
      .update({
        deleted_at: 'now()', // Database function to set current timestamp
        deleted_by: request.userId
      })
      .eq('id', request.messageId)
      .eq('room_id', request.roomId)
      .is('deleted_at', null)
      .select()
      .single()

  if (updateError || !updatedMessage) {
    console.error('Error soft deleting message:', updateError)
    // Check if it's a permission error (RLS policy blocked the operation)
    const errorWithCode = updateError as { code?: string; message?: string }
    if (
      errorWithCode?.code === 'PGRST116' ||
      errorWithCode?.message?.includes('No rows found')
    ) {
      throw new Error(
        'Message not found or you do not have permission to unsend it'
      )
    }
    throw new Error('Failed to unsend message')
  }

  // Get username for the unsent message
  const userName = await getUserDisplayName(authenticatedClient, updatedMessage.user_id)
  return transformDatabaseMessage(updatedMessage, null, userName)
}
