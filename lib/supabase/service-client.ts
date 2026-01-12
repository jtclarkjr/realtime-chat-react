import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/supabase'

let supabaseService: SupabaseClient<Database> | null = null
let cachedUrl: string | null = null
let cachedKey: string | null = null

export function getServiceClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Reset client if URL or key changed (hot reload / env change)
  if (supabaseService && (cachedUrl !== url || cachedKey !== key)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Service Client] Config changed, recreating client')
    }
    supabaseService = null
  }

  if (!supabaseService) {
    // Debug logging to verify correct configuration
    if (process.env.NODE_ENV === 'development') {
      console.log('[Service Client] Initializing with:', {
        url,
        keyPrefix: key.substring(0, 20) + '...'
      })
    }

    supabaseService = createClient<Database>(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    cachedUrl = url
    cachedKey = key
  }
  return supabaseService
}
