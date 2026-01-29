import type { SupabaseServerClient } from '@/lib/types/database'

export const getUserDisplayName = async (
  supabase: SupabaseServerClient,
  userId: string
): Promise<string> => {
  try {
    const { data, error } = await supabase.rpc('get_user_display_name', {
      user_uuid: userId
    })

    if (error) {
      console.error('Error getting user display name:', error)
      return 'Unknown User'
    }

    return data || 'Unknown User'
  } catch (error) {
    console.error('Error getting user display name:', error)
    return 'Unknown User'
  }
}
