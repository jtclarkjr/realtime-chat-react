import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase client for Realtime connections (WebSocket)
 *
 * Auth is disabled on this client to prevent:
 * - Automatic token refresh calls that expose user data in network tab
 * - Client-side session management
 *
 * Authentication is handled entirely server-side via cookies.
 * The Realtime connection will still authenticate using cookies set by the server.
 *
 * For login/signup flows, use createAuthClient() from './client-auth.ts'
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Disable client-side session management
        // Sessions are handled server-side via cookies
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'supabase-auth' // Still needed for realtime auth from cookies
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
          heartbeatIntervalMs: 30000 // Send heartbeat every 30 seconds
        },
        timeout: 20000, // Connection timeout
        reconnectAfterMs: (tries: number) => {
          // Exponential backoff: 1s, 2s, 4s, 8s, then every 10s
          return tries > 4
            ? 10000
            : Math.min(1000 * Math.pow(2, tries - 1), 10000)
        }
      }
    }
  )
}
