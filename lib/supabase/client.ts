import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        params: {
          eventsPerSecond: 10,
          heartbeatIntervalMs: 30000, // Send heartbeat every 30 seconds
        },
        timeout: 20000, // Connection timeout
        reconnectAfterMs: (tries: number) => {
          // Exponential backoff: 1s, 2s, 4s, 8s, then every 10s
          return tries > 4 ? 10000 : Math.min(1000 * Math.pow(2, tries - 1), 10000)
        },
      },
    }
  )
}
