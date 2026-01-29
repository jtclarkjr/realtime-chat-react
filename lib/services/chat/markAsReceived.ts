import { markMessageReceived } from '@/lib/redis'

export async function markAsReceived(
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
