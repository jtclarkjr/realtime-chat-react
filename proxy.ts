import { NextRequest, NextResponse } from 'next/server'

// Maximum body size in bytes (100KB for regular API requests)
const MAX_BODY_SIZE = 100 * 1024 // 100KB

// Routes that allow larger payloads (with specific limits)
const ROUTE_SIZE_LIMITS: Record<string, number> = {
  '/api/messages/send': 50 * 1024, // 50KB for messages
  '/api/rooms': 10 * 1024, // 10KB for room creation
  '/api/ai/stream': 50 * 1024 // 50KB for AI requests
}

export function proxy(request: NextRequest) {
  // Only check body size for POST, PUT, PATCH requests
  if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
    return NextResponse.next()
  }

  // Get content length from headers
  const contentLength = request.headers.get('content-length')

  if (!contentLength) {
    return NextResponse.json(
      {
        error: 'Content-Length required',
        code: 'LENGTH_REQUIRED'
      },
      { status: 411 }
    )
  }

  const bodySize = parseInt(contentLength, 10)

  if (!Number.isFinite(bodySize) || bodySize < 0) {
    return NextResponse.json(
      {
        error: 'Invalid Content-Length',
        code: 'INVALID_CONTENT_LENGTH'
      },
      { status: 400 }
    )
  }

  // Get the specific limit for this route or use default
  const pathname = new URL(request.url).pathname
  const maxSize = ROUTE_SIZE_LIMITS[pathname] || MAX_BODY_SIZE

  if (bodySize > maxSize) {
    return NextResponse.json(
      {
        error: 'Payload too large',
        code: 'PAYLOAD_TOO_LARGE',
        maxSize: `${maxSize / 1024}KB`
      },
      { status: 413 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*'
}
