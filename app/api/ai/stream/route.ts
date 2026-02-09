import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { sendAIMessage, markMessageAsAITrigger } from '@/lib/services/chat'
import { requireNonAnonymousAuth } from '@/lib/auth/middleware'
import { aiStreamRequestSchema, validateRequestBody } from '@/lib/validation'
import { plainErrorResponse, formatSSEError } from '@/lib/errors'
import { AI_STREAM_MODEL } from '@/lib/ai/constants'
import {
  AI_STREAM_SYSTEM_PROMPT,
  AI_STREAM_MARKDOWN_SYSTEM_PROMPT
} from '@/lib/ai/prompts'

// Configure route for streaming with body size limit
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds max for AI responses

// AI Assistant user constants
const AI_ASSISTANT = {
  id: 'ai-assistant',
  name: 'AI Assistant'
}

export const POST = async (request: NextRequest) => {
  // Authentication check - requires full (non-anonymous) account
  const authResult = await requireNonAnonymousAuth(request)

  // If auth failed, return error response
  if (authResult instanceof Response) {
    return authResult
  }

  const { user, supabase } = authResult

  try {
    // STREAMING VALIDATION PATTERN:
    // For streaming endpoints, we validate the entire body BEFORE initiating the stream.
    // This prevents resource allocation for invalid requests.
    // Body size is already limited by middleware to 50KB.
    const validation = await validateRequestBody(request, aiStreamRequestSchema)
    if (!validation.success) {
      // Convert NextResponse to regular Response for streaming endpoint
      return new Response(validation.response.body, {
        status: validation.response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const body = validation.data

    // Validate that the user making the request matches the userId
    if (user.id !== body.userId) {
      return plainErrorResponse('AI_REQUEST_SELF_ONLY')
    }

    // Initialize Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Anthropic API key not configured')
      return plainErrorResponse('AI_SERVICE_NOT_CONFIGURED')
    }

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
    const systemPrompt =
      body.responseFormat === 'markdown'
        ? AI_STREAM_MARKDOWN_SYSTEM_PROMPT
        : AI_STREAM_SYSTEM_PROMPT

    const stream = anthropic.messages.stream({
      model: AI_STREAM_MODEL,
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
          const aiMessage = await sendAIMessage({
            roomId: body.roomId,
            content: fullResponse.trim(),
            isPrivate: body.isPrivate || false,
            requesterId: body.userId
          })

          if (body.triggerMessageId) {
            await markMessageAsAITrigger(body.triggerMessageId)
          }

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
            await supabase.channel(body.roomId).httpSend('message', {
              id: aiMessage.id,
              content: aiMessage.content,
              user: AI_ASSISTANT,
              createdAt: aiMessage.createdAt,
              roomId: body.roomId,
              isAI: true,
              isPrivate: false
            })
          }

          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.enqueue(
            encoder.encode(formatSSEError('AI_RESPONSE_FAILED'))
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
    return plainErrorResponse('AI_RESPONSE_FAILED')
  }
}
