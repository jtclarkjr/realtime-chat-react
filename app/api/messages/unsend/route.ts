import { NextRequest, NextResponse } from 'next/server'
import { ChatService } from '@/lib/services/chat-service'
import { withAuth, validateUserAccess } from '@/lib/auth/middleware'
import { unsendMessageSchema, validateRequestBody } from '@/lib/validation'
import type { UnsendMessageRequest } from '@/lib/types/database'

export const POST = withAuth(
  async (request: NextRequest, { user, supabase }) => {
    try {
      // Validate request body with Zod schema
      const validation = await validateRequestBody(request, unsendMessageSchema)
      if (!validation.success) {
        return validation.response
      }

      const body = validation.data as UnsendMessageRequest

      // Validate that the user is unsending their own message
      if (!validateUserAccess(user.id, body.userId)) {
        return NextResponse.json(
          { error: 'You can only unsend your own messages' },
          { status: 403 }
        )
      }

      const chatService = new ChatService()
      const unsent = await chatService.unsendMessage(body, supabase)

      // Broadcast the unsend event to all users in the room
      await supabase.channel(body.roomId).httpSend('broadcast', {
        type: 'broadcast',
        event: 'message_unsent',
        payload: {
          messageId: body.messageId,
          roomId: body.roomId,
          deletedBy: body.userId,
          deletedAt: unsent.deletedAt
        }
      })

      return NextResponse.json({
        success: true,
        message: unsent
      })
    } catch (error) {
      console.error('Error unsending message:', error)

      // Check if it's a validation error vs server error
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to unsend message'
      const statusCode =
        errorMessage.includes('not found') ||
        errorMessage.includes('permission')
          ? 404
          : 500

      return NextResponse.json({ error: errorMessage }, { status: statusCode })
    }
  }
)
