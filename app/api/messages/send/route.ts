import { NextRequest, NextResponse } from 'next/server'
import { ChatService } from '@/lib/services/chat-service'
import { withAuth, validateUserAccess } from '@/lib/auth/middleware'
import type { SendMessageRequest } from '@/lib/types/database'

/**
 * @swagger
 * /api/messages/send:
 *   post:
 *     summary: Send a message
 *     description: Send a message to a chat room
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendMessageRequest'
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Cannot send messages as another user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to send message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const POST = withAuth(
  async (request: NextRequest, { user, supabase }) => {
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
          {
            error: 'Missing required fields: roomId, userId, username, content'
          },
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

      // Only broadcast non-private messages via Supabase Realtime
      if (!body.isPrivate) {
        await supabase.channel(body.roomId).send({
          type: 'broadcast',
          event: 'message',
          payload: message
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
