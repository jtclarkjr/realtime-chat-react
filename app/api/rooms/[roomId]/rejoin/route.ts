import { NextRequest, NextResponse } from 'next/server'
import { ChatService } from '@/lib/services/chat-service'

interface RouteParams {
  params: Promise<{
    roomId: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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
}
