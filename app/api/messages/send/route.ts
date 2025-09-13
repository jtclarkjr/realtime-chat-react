import { NextRequest, NextResponse } from 'next/server'
import { ChatService } from '@/lib/services/chat-service'
import { SendMessageRequest } from '@/lib/types/database'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
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

    const chatService = new ChatService()
    const message = await chatService.sendMessage(body)

    // Also broadcast via Supabase Realtime
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
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
}
