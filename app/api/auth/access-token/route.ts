import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const GET = async (request: NextRequest) => {
  const { supabase } = createClient(request)
  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  if (error || !session?.access_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(
    {
      accessToken: session.access_token,
      expiresAtMs: session.expires_at ? session.expires_at * 1000 : null
    },
    {
      headers: {
        'Cache-Control': 'no-store'
      }
    }
  )
}
