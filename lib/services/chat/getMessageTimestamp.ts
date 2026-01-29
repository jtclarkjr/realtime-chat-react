import type { SupabaseServerClient } from '@/lib/types/database'

export async function getMessageTimestamp(
  supabase: SupabaseServerClient,
  messageId: string
): Promise<string> {
  const { data: message } = await supabase
    .from('messages')
    .select('created_at')
    .eq('id', messageId)
    .single()

  return message?.created_at || new Date(0).toISOString()
}
