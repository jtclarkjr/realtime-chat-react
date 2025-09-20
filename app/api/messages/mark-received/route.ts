import { NextRequest, NextResponse } from 'next/server'
import { ChatService } from '@/lib/services/chat-service'
import { withAuth, validateUserAccess } from '@/lib/auth/middleware'
import type { MarkReceivedRequest } from '@/lib/types/database'

/**
 * @swagger
 * /api/messages/mark-received:
 *   post:
 *     summary: Mark message as received
 *     description: Mark a message as received by the current user
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, roomId, messageId]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID marking the message as received
 *               roomId:
 *                 type: string
 *                 format: uuid
 *                 description: Room ID containing the message
 *               messageId:
 *                 type: string
 *                 format: uuid
 *                 description: Message ID to mark as received
 *     responses:
 *       200:
 *         description: Message marked as received successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
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
 *         description: Cannot mark messages for another user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to mark message as received
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
