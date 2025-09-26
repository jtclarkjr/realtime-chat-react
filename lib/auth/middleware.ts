import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

type SupabaseClient = ReturnType<typeof createClient>['supabase']

/**
 * Authentication middleware for API routes
 * Checks for valid Supabase session and redirects to login if not authenticated
 */
export async function requireAuth(
  request: NextRequest
): Promise<
  { user: User; supabase: SupabaseClient; headers: Headers } | NextResponse
> {
  try {
    const { supabase, headers } = createClient(request)

    // Get the current user from the session
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    // If no user or there's an error, return unauthorized response
    if (error || !user) {
      console.error('Authentication failed:', error)
      return NextResponse.json(
        {
          error: 'Authentication required. Please sign in.',
          code: 'UNAUTHENTICATED'
        },
        { status: 401 }
      )
    }

    // Return user and supabase client for use in the route
    return { user, supabase, headers }
  } catch (error) {
    console.error('Error in authentication middleware:', error)
    return NextResponse.json(
      {
        error: 'Authentication verification failed.',
        code: 'AUTH_ERROR'
      },
      { status: 500 }
    )
  }
}

/**
 * Wrapper function to easily add authentication to API route handlers
 */
export function withAuth<T extends unknown[]>(
  handler: (
    request: NextRequest,
    auth: { user: User; supabase: SupabaseClient; headers: Headers },
    ...args: T
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await requireAuth(request)

    // If authResult is a NextResponse (error), return it
    if (authResult instanceof NextResponse) {
      return authResult
    }

    // Otherwise, call the handler with the authenticated user
    return handler(request, authResult, ...args)
  }
}

/**
 * Check if user ID matches the authenticated user (for additional security)
 */
export function validateUserAccess(
  authenticatedUserId: string,
  requestUserId: string
): boolean {
  return authenticatedUserId === requestUserId
}
