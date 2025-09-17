import { NextRequest, NextResponse } from 'next/server'
import { ChatService } from '@/lib/services/chat-service'
import { SendMessageRequest } from '@/lib/types/database'
import { withAuth, validateUserAccess } from '@/lib/auth/middleware'

export const POST = withAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const body: SendMessageRequest = await request.json()

    // Validate request
    if (
      !body.roomId ||
      !body.userId ||
      !body.username ||
      !body.content?.trim()
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, userId, username, content' },
        { status: 400 }
      )
    }

    // Validate that the user is sending messages as themselves
    if (!validateUserAccess(user.id, body.userId)) {
      return NextResponse.json(
        { error: 'You can only send messages as yourself' },
        { status: 403 }
      )
    }

    const chatService = new ChatService()
    const message = await chatService.sendMessage(body)

    // Also broadcast via Supabase Realtime (using authenticated client)
    await supabase.channel(body.roomId).send({
      type: 'broadcast',
      event: 'message',
      payload: message
    })

    return NextResponse.json({
      success: true,
      message
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
})
