import { NextRequest, NextResponse } from 'next/server'
import { ChatService } from '@/lib/services/chat-service'
import { MarkReceivedRequest } from '@/lib/types/database'

export async function POST(request: NextRequest) {
  try {
    const body: MarkReceivedRequest = await request.json()

    // Validate request
    if (!body.userId || !body.roomId || !body.messageId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, roomId, messageId' },
        { status: 400 }
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
}
