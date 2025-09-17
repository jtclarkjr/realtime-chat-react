import { NextRequest, NextResponse } from 'next/server'
import { ChatService } from '@/lib/services/chat-service'
import { withAuth, validateUserAccess } from '@/lib/auth/middleware'

interface RouteParams {
  params: Promise<{
    roomId: string
  }>
}

export const POST = withAuth(async (request: NextRequest, { user }, { params }: RouteParams) => {
  try {
    const { roomId } = await params
    const { userId } = await request.json()

    // Validate request
    if (!roomId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, userId' },
        { status: 400 }
      )
    }

    // Validate that the user is requesting their own missed messages
    if (!validateUserAccess(user.id, userId)) {
      return NextResponse.json(
        { error: 'You can only get missed messages for yourself' },
        { status: 403 }
      )
    }

    const chatService = new ChatService()
    const response = await chatService.getMissedMessages(userId, roomId)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error handling user rejoin:', error)
    return NextResponse.json(
      { error: 'Failed to get missed messages' },
      { status: 500 }
    )
  }
})

export const GET = withAuth(async (request: NextRequest, { user }, { params }: RouteParams) => {
  try {
    const { roomId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Validate request
    if (!roomId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: roomId, userId' },
        { status: 400 }
      )
    }

    // Validate that the user is requesting their own missed messages
    if (!validateUserAccess(user.id, userId)) {
      return NextResponse.json(
        { error: 'You can only get missed messages for yourself' },
        { status: 403 }
      )
    }

    const chatService = new ChatService()
    const response = await chatService.getMissedMessages(userId, roomId)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error handling user rejoin (GET):', error)
    return NextResponse.json(
      { error: 'Failed to get missed messages' },
      { status: 500 }
    )
  }
})
