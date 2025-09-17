import { NextRequest, NextResponse } from 'next/server'
import { ChatService } from '@/lib/services/chat-service'
import { withAuth, validateUserAccess } from '@/lib/auth/middleware'
import type { MarkReceivedRequest } from '@/lib/types/database'

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body: MarkReceivedRequest = await request.json()

    // Validate request
    if (!body.userId || !body.roomId || !body.messageId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, roomId, messageId' },
        { status: 400 }
      )
    }

    // Validate that the user is marking messages for themselves
    if (!validateUserAccess(user.id, body.userId)) {
      return NextResponse.json(
        { error: 'You can only mark messages as received for yourself' },
        { status: 403 }
      )
    }

    const chatService = new ChatService()
    await chatService.markAsReceived(body.userId, body.roomId, body.messageId)

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Error marking message as received:', error)
    return NextResponse.json(
      { error: 'Failed to mark message as received' },
      { status: 500 }
    )
  }
})
