import { NextRequest, NextResponse } from 'next/server'
import { roomCacheService } from '@/lib/services/room-cache-service'
import { withAuth, withNonAnonymousAuth } from '@/lib/auth/middleware'
import {
  createRoomSchema,
  deleteRoomQuerySchema,
  validateRequestBody,
  validateQueryParams
} from '@/lib/validation'

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

export const POST = withNonAnonymousAuth(async (request: NextRequest, auth) => {
  try {
    // Validate request body with Zod schema
    const validation = await validateRequestBody(request, createRoomSchema)
    if (!validation.success) {
      return validation.response
    }

    const { name, description } = validation.data

    // Use the cache service which handles database creation and cache invalidation
    const room = await roomCacheService.createRoom({
      name,
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

export const DELETE = withNonAnonymousAuth(async (request: NextRequest) => {
  try {
    // Validate query parameters with Zod schema
    const validation = validateQueryParams(request, deleteRoomQuerySchema)
    if (!validation.success) {
      return validation.response
    }

    const { id: roomId } = validation.data

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
