import { createBrowserClient } from '@supabase/ssr'
import {
  REALTIME_EVENTS_PER_SECOND,
  REALTIME_HEARTBEAT_INTERVAL_MS,
  REALTIME_CONNECTION_TIMEOUT_MS,
  REALTIME_INITIAL_BACKOFF_MS,
  REALTIME_MAX_BACKOFF_MS,
  REALTIME_MAX_BACKOFF_TRIES
} from './constants'

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
          eventsPerSecond: REALTIME_EVENTS_PER_SECOND,
          heartbeatIntervalMs: REALTIME_HEARTBEAT_INTERVAL_MS
        },
        timeout: REALTIME_CONNECTION_TIMEOUT_MS,
        reconnectAfterMs: (tries: number) => {
          // Exponential backoff: 1s, 2s, 4s, 8s, then every 10s
          return tries > REALTIME_MAX_BACKOFF_TRIES
            ? REALTIME_MAX_BACKOFF_MS
            : Math.min(
                REALTIME_INITIAL_BACKOFF_MS * Math.pow(2, tries - 1),
                REALTIME_MAX_BACKOFF_MS
              )
        }
      }
    }
  )
}
