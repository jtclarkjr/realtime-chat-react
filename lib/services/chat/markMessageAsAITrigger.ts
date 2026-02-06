import { setMessageHasAIResponse } from '@/lib/supabase/db/chat'

export const markMessageAsAITrigger = async (
  messageId: string
): Promise<void> => {
  try {
    await setMessageHasAIResponse(messageId)
  } catch (error) {
    console.error('Error marking message as AI trigger:', error)
  }
}
