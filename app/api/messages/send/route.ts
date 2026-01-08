import { NextRequest, NextResponse } from 'next/server'
import { ChatService } from '@/lib/services/chat-service'
import { userService } from '@/lib/services/user-service'
import { withAuth, validateUserAccess } from '@/lib/auth/middleware'
import { sendMessageSchema, validateRequestBody } from '@/lib/validation'
import type { SendMessageRequest } from '@/lib/types/database'

export const POST = withAuth(
  async (request: NextRequest, { user, supabase }) => {
    try {
      // Validate request body with Zod schema
      const validation = await validateRequestBody(request, sendMessageSchema)
      if (!validation.success) {
        return validation.response
      }

      const body = validation.data as SendMessageRequest

      // Validate that the user is sending messages as themselves
      if (!validateUserAccess(user.id, body.userId)) {
        return NextResponse.json(
          { error: 'You can only send messages as yourself' },
          { status: 403 }
        )
      }

      const chatService = new ChatService()
      const message = await chatService.sendMessage(body)

      // Only broadcast non-private messages via Supabase Realtime
      if (!body.isPrivate) {
        // Get sender's avatar for the broadcast
        const senderProfile = await userService.getUserProfile(body.userId)

        const broadcastMessage = {
          ...message,
          user: {
            ...message.user,
            avatar_url: senderProfile?.avatar_url || undefined
          }
        }

        await supabase.channel(body.roomId).httpSend('broadcast', {
          type: 'broadcast',
          event: 'message',
          payload: broadcastMessage
        })
      }

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
)
