import { getServiceClient } from '@/lib/supabase/server'

/**
 * Creates or gets the AI Assistant user in Supabase Auth
 * This should be run once to set up the AI user
 */
export async function setupAIUser() {
  const supabase = getServiceClient()

  // Try to create an AI user with admin privileges
  const { data: aiUser, error } = await supabase.auth.admin.createUser({
    email: '', // Use your domain
    password: crypto.randomUUID(), // Random password since AI won't login
    user_metadata: {
      full_name: 'AI Assistant',
      avatar_url: null, // AI doesn't need an avatar
      is_ai_user: true
    },
    email_confirm: true // Auto-confirm since it's an internal user
  })

  if (error) {
    console.error('Error creating AI user:', error)
    return null
  }

  console.log('AI user created with ID:', aiUser.user?.id)
  return aiUser.user?.id
}

// Export the AI user ID constant (you'll need to set this after running setupAIUser)
export const AI_USER_ID = process.env.AI_USER_ID as string | undefined // Set AI user ID from Supabase Auth
