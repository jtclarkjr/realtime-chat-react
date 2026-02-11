import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { sendAIMessage, markMessageAsAITrigger } from '@/lib/services/chat'
import { requireNonAnonymousAuth } from '@/lib/auth/middleware'
import { aiStreamRequestSchema, validateRequestBody } from '@/lib/validation'
import { plainErrorResponse, formatSSEError } from '@/lib/errors'
import { getServiceClient } from '@/lib/supabase/server'
import { CURRENT_TIME_CONTEXT_TEMPLATE } from '@/lib/ai/constants'
import {
  AI_STREAM_SYSTEM_PROMPT,
  AI_STREAM_MARKDOWN_SYSTEM_PROMPT,
  AI_WEB_SEARCH_INSTRUCTIONS
} from '@/lib/ai/prompts'
import { shouldUseWebSearch } from '@/lib/ai/recency-detector'
import { getEffectiveAIFlags } from '@/lib/ai/feature-flags-runtime'
import { resolveAIModel } from '@/lib/ai/model-selector'
import {
  getCurrentDateContext,
  getWebSearchConfig
} from '@/lib/ai/stream-config'
import {
  streamAnthropicTextToSSE,
  enqueueContentByChunks
} from '@/lib/ai/stream-sse'
import { generateAIResponse } from '@/lib/ai/response-strategy'
import type { AIStreamRealtimePayload } from '@/lib/types/ai-stream'

export const runtime = 'nodejs'
export const maxDuration = 60
const STREAM_BROADCAST_INTERVAL_MS = 120

const AI_ASSISTANT = {
  id: 'ai-assistant',
  name: 'AI Assistant'
}

const broadcastAIStreamEvent = async ({
  roomId,
  payload,
  supabase
}: {
  roomId: string
  payload: AIStreamRealtimePayload
  supabase: {
    channel: (roomId: string) => {
      httpSend: (event: string, payload: unknown) => Promise<unknown>
    }
  }
}) => {
  try {
    const supabaseService = getServiceClient()
    await supabaseService.channel(roomId).httpSend('ai_stream', payload)
  } catch (broadcastError) {
    try {
      await supabase.channel(roomId).httpSend('ai_stream', payload)
    } catch (fallbackError) {
      console.error('AI stream broadcast failed (primary + fallback):', {
        broadcastError,
        fallbackError
      })
    }
  }
}

const buildDatedSystemPrompt = ({
  responseFormat,
  searchNeeded
}: {
  responseFormat?: 'plain' | 'markdown'
  searchNeeded: boolean
}) => {
  const baseSystemPrompt =
    responseFormat === 'markdown'
      ? AI_STREAM_MARKDOWN_SYSTEM_PROMPT
      : AI_STREAM_SYSTEM_PROMPT
  const systemPrompt = searchNeeded
    ? `${baseSystemPrompt}\n\n${AI_WEB_SEARCH_INSTRUCTIONS}`
    : baseSystemPrompt

  const { nowIso, nowUtc } = getCurrentDateContext()
  const timeContext = CURRENT_TIME_CONTEXT_TEMPLATE.replace(
    '{{NOW_ISO}}',
    nowIso
  ).replace('{{NOW_UTC}}', nowUtc)

  return `${systemPrompt}\n\n${timeContext}`
}

const persistAndBroadcastAIMessage = async ({
  roomId,
  userId,
  triggerMessageId,
  isPrivate,
  content,
  streamSourceId,
  supabase
}: {
  roomId: string
  userId: string
  triggerMessageId?: string
  isPrivate?: boolean
  content: string
  streamSourceId?: string
  supabase: {
    channel: (roomId: string) => {
      httpSend: (event: string, payload: unknown) => Promise<unknown>
    }
  }
}) => {
  const aiMessage = await sendAIMessage({
    roomId,
    content,
    isPrivate: isPrivate || false,
    requesterId: userId
  })

  if (triggerMessageId) {
    await markMessageAsAITrigger(triggerMessageId)
  }

  if (isPrivate) return aiMessage

  const broadcastMessage = {
    ...aiMessage,
    roomId,
    channelId: roomId,
    isAI: true,
    isPrivate: false,
    streamSourceId
  }

  try {
    const supabaseService = getServiceClient()
    await supabaseService.channel(roomId).httpSend('message', broadcastMessage)
  } catch (broadcastError) {
    try {
      await supabase.channel(roomId).httpSend('message', broadcastMessage)
    } catch (fallbackError) {
      console.error('AI broadcast failed (primary + fallback):', {
        broadcastError,
        fallbackError
      })
    }
  }

  return aiMessage
}

export const POST = async (request: NextRequest) => {
  const authResult = await requireNonAnonymousAuth(request)
  if (authResult instanceof Response) return authResult

  const { user, supabase } = authResult

  try {
    const validation = await validateRequestBody(request, aiStreamRequestSchema)
    if (!validation.success) {
      return new Response(validation.response.body, {
        status: validation.response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const body = validation.data

    if (user.id !== body.userId) {
      return plainErrorResponse('AI_REQUEST_SELF_ONLY')
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Anthropic API key not configured')
      return plainErrorResponse('AI_SERVICE_NOT_CONFIGURED')
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    const messages: Anthropic.MessageParam[] = []
    for (const msg of body.previousMessages || []) {
      messages.push({
        role: msg.isAi ? 'assistant' : 'user',
        content: msg.isAi ? msg.content : `${msg.userName}: ${msg.content}`
      })
    }

    const hasTargetMessage = Boolean(
      body.targetMessageId && body.targetMessageContent
    )
    const currentUserMessage = hasTargetMessage
      ? [
          'You are drafting a chat reply for the user.',
          `Selected message to reply to:\n"""${body.targetMessageContent}"""`,
          body.customPrompt
            ? `Custom instruction for the reply:\n${body.customPrompt}`
            : 'Write a natural, context-aware reply to the selected message.',
          'Return only the final reply text the user should send.',
          'Do not include prefaces, labels, quotes, or explanations.'
        ].join('\n\n')
      : body.message

    messages.push({ role: 'user', content: currentUserMessage })

    const selectedModel = resolveAIModel({
      message: body.message,
      customPrompt: body.customPrompt,
      targetMessageContent: body.targetMessageContent,
      responseFormat: body.responseFormat
    })

    const flags = await getEffectiveAIFlags()
    if (flags.fallbackApplied && flags.reason) {
      console.warn(`AI feature flag fallback applied: ${flags.reason}`)
    }

    const webSearchConfig = getWebSearchConfig()
    const searchRequested = shouldUseWebSearch({
      userMessage: body.message,
      customPrompt: body.customPrompt,
      targetMessageContent: body.targetMessageContent
    })

    const datedSystemPrompt = buildDatedSystemPrompt({
      responseFormat: body.responseFormat,
      searchNeeded: webSearchConfig.enabled && searchRequested
    })

    const tempMessageId = crypto.randomUUID()
    const streamStartedAt = new Date().toISOString()
    const encoder = new TextEncoder()
    const shouldBroadcastStream = !body.isPrivate && !body.draftOnly
    let latestFullContent = ''

    const readableStream = new ReadableStream({
      async start(controller) {
        let contentBroadcastTimer: NodeJS.Timeout | null = null
        let lastBroadcastedContent = ''

        const broadcastStreamContent = async (force = false): Promise<void> => {
          if (!shouldBroadcastStream) return
          if (!force && latestFullContent === lastBroadcastedContent) return

          await broadcastAIStreamEvent({
            roomId: body.roomId,
            supabase,
            payload: {
              eventType: 'content',
              streamId: tempMessageId,
              roomId: body.roomId,
              requesterId: body.userId,
              isPrivate: false,
              user: AI_ASSISTANT,
              createdAt: streamStartedAt,
              fullContent: latestFullContent
            }
          })

          lastBroadcastedContent = latestFullContent
        }

        const scheduleStreamContentBroadcast = (): void => {
          if (!shouldBroadcastStream || contentBroadcastTimer) return
          contentBroadcastTimer = setTimeout(() => {
            contentBroadcastTimer = null
            void broadcastStreamContent().catch((error) => {
              console.error(
                'Failed to broadcast throttled AI stream content:',
                error
              )
            })
          }, STREAM_BROADCAST_INTERVAL_MS)
        }

        const flushPendingStreamContent = async (): Promise<void> => {
          if (!shouldBroadcastStream) return
          if (contentBroadcastTimer) {
            clearTimeout(contentBroadcastTimer)
            contentBroadcastTimer = null
          }
          await broadcastStreamContent(true)
        }

        try {
          const initialData = {
            type: 'start',
            messageId: tempMessageId,
            user: AI_ASSISTANT
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
          )

          if (shouldBroadcastStream) {
            await broadcastAIStreamEvent({
              roomId: body.roomId,
              supabase,
              payload: {
                eventType: 'start',
                streamId: tempMessageId,
                roomId: body.roomId,
                requesterId: body.userId,
                isPrivate: false,
                user: AI_ASSISTANT,
                createdAt: streamStartedAt,
                fullContent: ''
              }
            })
          }

          const generation = await generateAIResponse({
            anthropic,
            selectedModel,
            systemPrompt: datedSystemPrompt,
            messages,
            flags,
            webSearchConfig,
            searchRequested
          })

          const fullResponse =
            generation.streamMode === 'native_stream'
              ? await streamAnthropicTextToSSE({
                  stream: generation.stream,
                  controller,
                  encoder,
                  messageId: tempMessageId,
                  onFullContent: (fullContent) => {
                    latestFullContent = fullContent
                    scheduleStreamContentBroadcast()
                  }
                })
              : (() => {
                  enqueueContentByChunks(
                    controller,
                    encoder,
                    tempMessageId,
                    generation.fullResponse,
                    (fullContent) => {
                      latestFullContent = fullContent
                      scheduleStreamContentBroadcast()
                    }
                  )
                  return generation.fullResponse
                })()

          const trimmedResponse = fullResponse.trim()
          latestFullContent = trimmedResponse
          await flushPendingStreamContent()
          let persistedMessageId = tempMessageId
          let persistedCreatedAt = new Date().toISOString()

          if (!body.draftOnly) {
            const aiMessage = await persistAndBroadcastAIMessage({
              roomId: body.roomId,
              userId: body.userId,
              triggerMessageId: body.triggerMessageId,
              isPrivate: body.isPrivate,
              content: trimmedResponse,
              streamSourceId: tempMessageId,
              supabase
            })

            persistedMessageId = aiMessage.id
            persistedCreatedAt = aiMessage.createdAt
          }

          const completeData = {
            type: 'complete',
            messageId: persistedMessageId,
            fullContent: trimmedResponse,
            createdAt: persistedCreatedAt
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`)
          )

          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          if (contentBroadcastTimer) {
            clearTimeout(contentBroadcastTimer)
            contentBroadcastTimer = null
          }
          if (shouldBroadcastStream) {
            await broadcastAIStreamEvent({
              roomId: body.roomId,
              supabase,
              payload: {
                eventType: 'error',
                streamId: tempMessageId,
                roomId: body.roomId,
                requesterId: body.userId,
                isPrivate: false,
                user: AI_ASSISTANT,
                createdAt: streamStartedAt,
                fullContent: latestFullContent
              }
            })
          }
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
