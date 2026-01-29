import { getServiceClient } from '@/lib/supabase/service-client'

export async function markMessageAsAITrigger(messageId: string): Promise<void> {
  const supabase = getServiceClient()

  try {
    const { error } = await supabase
      .from('messages')
      .update({ has_ai_response: true })
      .eq('id', messageId)

    if (error) {
      console.error('Error marking message as AI trigger:', error)
    }
  } catch (error) {
    console.error('Error marking message as AI trigger:', error)
  }
}
