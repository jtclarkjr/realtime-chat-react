import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export async function getAuthenticatedUser(): Promise<User | null> {
  const headersList = await headers()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const request = new Request(baseUrl, {
    headers: Object.fromEntries(headersList.entries())
  })
  const { supabase } = createClient(request)
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}
