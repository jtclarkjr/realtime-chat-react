import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/supabase'

let supabaseService: SupabaseClient<Database> | null = null

export function getServiceClient(): SupabaseClient<Database> {
  if (!supabaseService) {
    supabaseService = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabaseService
}
