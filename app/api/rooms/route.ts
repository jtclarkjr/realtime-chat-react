import { NextRequest, NextResponse } from 'next/server'
import { roomCacheService } from '@/lib/services/room-cache-service'
import { withAuth } from '@/lib/auth/middleware'

export const GET = withAuth(async () => {
  try {
    // Use the cache service which handles default room creation and caching
    const rooms = await roomCacheService.getAllRooms()

    return NextResponse.json({ rooms })
  } catch (error) {
    console.error('Unexpected error fetching rooms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      )
    }

    // Use the cache service which handles database creation and cache invalidation
    const room = await roomCacheService.createRoom({
      name: name.trim(),
      description: description || null,
      created_by: auth.user.id
    })

    return NextResponse.json({ room })
  } catch (error) {
    // Handle specific database errors
    if (
      (error instanceof Error && error.message.includes('duplicate key')) ||
      (error instanceof Error && error.message.includes('unique constraint'))
    ) {
      return NextResponse.json(
        { error: 'A room with this name already exists' },
        { status: 409 }
      )
    }

    console.error('Unexpected error creating room:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const DELETE = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('id')

    if (!roomId || typeof roomId !== 'string') {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      )
    }

    // Use the cache service which handles database deletion and cache invalidation
    const success = await roomCacheService.deleteRoom(roomId)

    if (!success) {
      return NextResponse.json(
        { error: 'Room not found or unauthorized to delete' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // Handle specific database errors
    if (error instanceof Error && error.message.includes('unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this room' },
        { status: 403 }
      )
    }

    console.error('Unexpected error deleting room:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
