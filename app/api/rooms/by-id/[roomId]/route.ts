import { NextRequest, NextResponse } from 'next/server'
import { roomCacheService } from '@/lib/services/room-cache-service'
import { withAuth } from '@/lib/auth/middleware'

export const GET = withAuth(async (
  request: NextRequest,
  { user },
  { params }: { params: Promise<{ roomId: string }> }
) => {
  try {
    const { roomId } = await params

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      )
    }

    // Use the cache service to get room by ID
    const room = await roomCacheService.getRoomById(roomId)

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    return NextResponse.json({ room })
  } catch (error) {
    console.error('Unexpected error fetching room by id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
