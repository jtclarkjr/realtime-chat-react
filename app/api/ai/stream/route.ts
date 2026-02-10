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
import { isTavilyQuotaExceededError } from '@/lib/ai/web-search'
import { shouldUseWebSearch } from '@/lib/ai/recency-detector'
import { resolveAIModel } from '@/lib/ai/model-selector'
import {
  disableTavilyTemporarily,
  getCurrentDateContext,
  getWebSearchConfig,
  isTavilyTemporarilyDisabled,
  type WebSearchConfig
} from '@/lib/ai/stream-config'
import {
  streamAnthropicTextToSSE,
  enqueueContentByChunks
} from '@/lib/ai/stream-sse'
import { runToolEnabledGeneration } from '@/lib/ai/stream-tool-generation'

export const runtime = 'nodejs'
export const maxDuration = 60

const AI_ASSISTANT = {
  id: 'ai-assistant',
  name: 'AI Assistant'
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

const streamStandardAIResponse = async ({
  anthropic,
  selectedModel,
  systemPrompt,
  messages,
  controller,
  encoder,
  messageId
}: {
  anthropic: Anthropic
  selectedModel: string
  systemPrompt: string
  messages: Anthropic.MessageParam[]
  controller: ReadableStreamDefaultController
  encoder: TextEncoder
  messageId: string
}): Promise<string> => {
  const stream = anthropic.messages.stream({
    model: selectedModel,
    max_tokens: 1024,
    system: systemPrompt,
    messages
  })

  return streamAnthropicTextToSSE({
    stream,
    controller,
    encoder,
    messageId
  })
}

const streamSearchEnabledAIResponse = async ({
  anthropic,
  selectedModel,
  systemPrompt,
  messages,
  controller,
  encoder,
  messageId,
  webSearchConfig
}: {
  anthropic: Anthropic
  selectedModel: string
  systemPrompt: string
  messages: Anthropic.MessageParam[]
  controller: ReadableStreamDefaultController
  encoder: TextEncoder
  messageId: string
  webSearchConfig: WebSearchConfig
}): Promise<string> => {
  try {
    const generated = await runToolEnabledGeneration({
      anthropic,
      selectedModel,
      systemPrompt,
      messages,
      maxResults: webSearchConfig.maxResults,
      timeoutMs: webSearchConfig.timeoutMs
    })

    enqueueContentByChunks(controller, encoder, messageId, generated)
    return generated
  } catch (error) {
    if (!isTavilyQuotaExceededError(error)) {
      throw error
    }

    disableTavilyTemporarily(webSearchConfig.quotaCooldownMs)
    console.warn(
      `Tavily quota exceeded. Disabling web search for ${webSearchConfig.quotaCooldownMs}ms.`
    )

    return streamStandardAIResponse({
      anthropic,
      selectedModel,
      systemPrompt,
      messages,
      controller,
      encoder,
      messageId
    })
  }
}

const persistAndBroadcastAIMessage = async ({
  roomId,
  userId,
  triggerMessageId,
  isPrivate,
  content,
  supabase
}: {
  roomId: string
  userId: string
  triggerMessageId?: string
  isPrivate?: boolean
  content: string
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
    isPrivate: false
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

    const webSearchConfig = getWebSearchConfig()
    const isWebSearchConfigured = Boolean(process.env.TAVILY_API_KEY)
    if (webSearchConfig.enabled && !isWebSearchConfigured) {
      console.warn('AI web search enabled but TAVILY_API_KEY is not configured')
    }

    const searchNeeded =
      webSearchConfig.enabled &&
      isWebSearchConfigured &&
      !isTavilyTemporarilyDisabled() &&
      shouldUseWebSearch({
        userMessage: body.message,
        customPrompt: body.customPrompt,
        targetMessageContent: body.targetMessageContent
      })

    const datedSystemPrompt = buildDatedSystemPrompt({
      responseFormat: body.responseFormat,
      searchNeeded
    })

    const tempMessageId = crypto.randomUUID()
    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const initialData = {
            type: 'start',
            messageId: tempMessageId,
            user: AI_ASSISTANT
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
          )

          const fullResponse = searchNeeded
            ? await streamSearchEnabledAIResponse({
                anthropic,
                selectedModel,
                systemPrompt: datedSystemPrompt,
                messages,
                controller,
                encoder,
                messageId: tempMessageId,
                webSearchConfig
              })
            : await streamStandardAIResponse({
                anthropic,
                selectedModel,
                systemPrompt: datedSystemPrompt,
                messages,
                controller,
                encoder,
                messageId: tempMessageId
              })

          const trimmedResponse = fullResponse.trim()
          let persistedMessageId = tempMessageId
          let persistedCreatedAt = new Date().toISOString()

          if (!body.draftOnly) {
            const aiMessage = await persistAndBroadcastAIMessage({
              roomId: body.roomId,
              userId: body.userId,
              triggerMessageId: body.triggerMessageId,
              isPrivate: body.isPrivate,
              content: trimmedResponse,
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
          controller.enqueue(encoder.encode(formatSSEError('AI_RESPONSE_FAILED')))
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
