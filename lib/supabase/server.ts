import type { CookieMethodsServer } from '@supabase/ssr'
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader
} from '@supabase/ssr'

export function createClient(request: Request) {
  const headers = new Headers()

  const cookies: CookieMethodsServer = {
    getAll() {
      return parseCookieHeader(request.headers.get('Cookie'))
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) =>
        headers.append('Set-Cookie', serializeCookieHeader(name, value, options))
      )
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies
    }
  )

  return { supabase, headers }
}
