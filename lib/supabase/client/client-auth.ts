import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase client for authentication flows (login/signup)
 * This client handles OAuth redirects ONLY - session is managed server-side
 */
export function createAuthClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Don't persist session - OAuth just handles the redirect
        // The callback will set server-side cookies
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: 'pkce' // Use PKCE flow for OAuth
      }
    }
  )
}
