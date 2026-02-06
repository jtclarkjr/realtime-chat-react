import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { errorResponse } from '@/lib/errors'

// Maximum body size in bytes (100KB for regular API requests)
const MAX_BODY_SIZE = 100 * 1024 // 100KB

// Routes that allow larger payloads (with specific limits)
const ROUTE_SIZE_LIMITS: Record<string, number> = {
  '/api/messages/send': 50 * 1024, // 50KB for messages
  '/api/rooms': 10 * 1024, // 10KB for room creation
  '/api/ai/stream': 50 * 1024 // 50KB for AI requests
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isApiRoute = pathname.startsWith('/api/')

  // Keep API payload guardrail behavior
  if (isApiRoute && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentLength = request.headers.get('content-length')

    if (!contentLength) {
      return errorResponse('LENGTH_REQUIRED')
    }

    const bodySize = parseInt(contentLength, 10)

    if (!Number.isFinite(bodySize) || bodySize < 0) {
      return errorResponse('INVALID_CONTENT_LENGTH')
    }

    const maxSize = ROUTE_SIZE_LIMITS[pathname] || MAX_BODY_SIZE

    if (bodySize > maxSize) {
      return errorResponse('PAYLOAD_TOO_LARGE', {
        maxSize: `${maxSize / 1024}KB`
      })
    }
  }

  // Refresh auth cookies on every app request so RSC/prefetch doesn't run on stale access tokens.
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        }
      }
    }
  )

  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'
  ]
}
