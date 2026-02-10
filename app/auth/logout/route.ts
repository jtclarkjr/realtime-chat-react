import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)
  const { supabase, headers } = createClient(request)
  const {
    data: { user }
  } = await supabase.auth.getUser()

  // Revoke current session and clear auth cookies before redirecting.
  await supabase.auth.signOut()

  const redirectPath = user?.is_anonymous ? '/login?guest=1' : '/login'
  const response = NextResponse.redirect(`${origin}${redirectPath}`)
  headers.forEach((value, key) => {
    response.headers.append(key, value)
  })

  return response
}
