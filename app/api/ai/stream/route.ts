import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ChatService } from '@/lib/services/chat-service'
import { requireAuth } from '@/lib/auth/middleware'

// AI Assistant user constants
const AI_ASSISTANT = {
  id: 'ai-assistant',
  name: 'AI Assistant'
}

interface AIStreamRequest {
  roomId: string
  userId: string
  message: string
  isPrivate?: boolean
  previousMessages?: Array<{
    content: string
    isAi: boolean
    userName: string
  }>
}

export const POST = async (request: NextRequest) => {
  // Authentication check - required for streaming endpoints
  const authResult = await requireAuth(request)

  // If auth failed, return error response
  if (authResult instanceof Response) {
    return authResult
  }

  const { user, supabase } = authResult

  try {
    const body: AIStreamRequest = await request.json()

    // Validate request
    if (!body.roomId || !body.userId || !body.message?.trim()) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: roomId, userId, message'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate that the user making the request matches the userId
    if (user.id !== body.userId) {
      return new Response(
        JSON.stringify({
          error: 'You can only request AI responses for yourself'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Anthropic API key not configured')
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Prepare conversation context for Anthropic
    const systemPrompt = `You are a helpful AI assistant in a chat room. You should:
- Be friendly and conversational
- Provide helpful and accurate responses
- Keep responses concise but informative
- Stay on topic with the conversation
- Be respectful to all users`

    const messages: Anthropic.MessageParam[] = []

    // Add previous messages for context (if provided)
    if (body.previousMessages && body.previousMessages.length > 0) {
      body.previousMessages.forEach((msg) => {
        messages.push({
          role: msg.isAi ? 'assistant' : 'user',
          content: msg.isAi ? msg.content : `${msg.userName}: ${msg.content}`
        })
      })
    }

    // Add the current user message
    messages.push({
      role: 'user',
      content: body.message
    })

    // Create streaming response with Anthropic
    const stream = anthropic.messages.stream({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 1024,
      system: systemPrompt,
      messages
    })

    // Create a TransformStream for processing the Anthropic stream
    let fullResponse = ''
    // Use a temporary ID first, will be replaced with database ID
    const tempMessageId = crypto.randomUUID()

    const encoder = new TextEncoder()
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial message metadata
          const initialData = {
            type: 'start',
            messageId: tempMessageId,
            user: AI_ASSISTANT
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
          )

          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const content = chunk.delta.text
              if (content) {
                fullResponse += content

                // Send streaming content
                const streamData = {
                  type: 'content',
                  messageId: tempMessageId,
                  content,
                  fullContent: fullResponse
                }
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(streamData)}\n\n`)
                )
              }
            }
          }

          // Save complete message to database
          const chatService = new ChatService()
          const aiMessage = await chatService.sendAIMessage({
            roomId: body.roomId,
            content: fullResponse.trim(),
            isPrivate: body.isPrivate || false,
            requesterId: body.userId
          })

          // Send completion with database info
          const completeData = {
            type: 'complete',
            messageId: aiMessage.id,
            fullContent: fullResponse.trim(),
            createdAt: aiMessage.createdAt
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`)
          )

          // Only broadcast public AI messages via Supabase Realtime
          // Private messages are only visible to the requesting user
          if (!body.isPrivate) {
            await supabase.channel(body.roomId).send({
              type: 'broadcast',
              event: 'message',
              payload: {
                id: aiMessage.id,
                content: aiMessage.content,
                user: AI_ASSISTANT,
                createdAt: aiMessage.createdAt,
                roomId: body.roomId,
                isAI: true,
                isPrivate: false
              }
            })
          }

          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          const errorData = {
            type: 'error',
            error: 'Failed to get AI response'
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`)
          )
          controller.close()
        }
      }
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  } catch (error) {
    console.error('Error in AI stream:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to get AI response' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
