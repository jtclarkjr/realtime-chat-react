import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { sendAIMessage, markMessageAsAITrigger } from '@/lib/services/chat'
import { requireNonAnonymousAuth } from '@/lib/auth/middleware'
import { aiStreamRequestSchema, validateRequestBody } from '@/lib/validation'
import { plainErrorResponse, formatSSEError } from '@/lib/errors'
import { getServiceClient } from '@/lib/supabase/server'
import {
  AI_STREAM_SYSTEM_PROMPT,
  AI_STREAM_MARKDOWN_SYSTEM_PROMPT,
  AI_WEB_SEARCH_INSTRUCTIONS
} from '@/lib/ai/prompts'
import { searchWeb, buildSourcesMarkdown } from '@/lib/ai/web-search'
import { shouldUseWebSearch } from '@/lib/ai/recency-detector'
import { resolveAIModel } from '@/lib/ai/model-selector'

// Configure route for streaming with body size limit
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds max for AI responses

// AI Assistant user constants
const AI_ASSISTANT = {
  id: 'ai-assistant',
  name: 'AI Assistant'
}

const WEB_SEARCH_TOOL_NAME = 'web_search'
const TOOL_LOOP_LIMIT = 2

const getParsedPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const getWebSearchConfig = () => ({
  enabled: process.env.AI_WEB_SEARCH_ENABLED !== 'false',
  maxResults: getParsedPositiveInt(process.env.AI_WEB_SEARCH_MAX_RESULTS, 5),
  timeoutMs: getParsedPositiveInt(process.env.AI_WEB_SEARCH_TIMEOUT_MS, 6000)
})

const extractTextFromBlocks = (blocks: Anthropic.ContentBlock[]): string =>
  blocks
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim()

const appendSourcesIfMissing = (
  content: string,
  sourcesMarkdown: string
): string => {
  if (!sourcesMarkdown) return content.trim()
  if (/^\s*sources\s*:/im.test(content)) return content.trim()
  return `${content.trim()}\n\n${sourcesMarkdown}`
}

const enqueueContentByChunks = (
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  messageId: string,
  fullContent: string
) => {
  if (!fullContent.trim()) return

  let assembledContent = ''
  const chunkSize = 160
  for (let i = 0; i < fullContent.length; i += chunkSize) {
    const contentChunk = fullContent.slice(i, i + chunkSize)
    assembledContent += contentChunk
    const streamData = {
      type: 'content',
      messageId,
      content: contentChunk,
      fullContent: assembledContent
    }
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify(streamData)}\n\n`)
    )
  }
}

const getMessageTextContent = (message: Anthropic.Message): string => {
  return extractTextFromBlocks(message.content)
}

const getWebSearchToolDefinition = (): Anthropic.Tool => ({
  name: WEB_SEARCH_TOOL_NAME,
  description:
    'Search the public web for current and time-sensitive information. Use concise, specific queries.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The exact search query to run on the web.'
      }
    },
    required: ['query']
  }
})

const runToolEnabledGeneration = async ({
  anthropic,
  selectedModel,
  systemPrompt,
  messages,
  maxResults,
  timeoutMs
}: {
  anthropic: Anthropic
  selectedModel: string
  systemPrompt: string
  messages: Anthropic.MessageParam[]
  maxResults: number
  timeoutMs: number
}): Promise<string> => {
  const conversation: Anthropic.MessageParam[] = [...messages]
  const webSearchTool = getWebSearchToolDefinition()
  let latestResults: Awaited<ReturnType<typeof searchWeb>> = []

  for (let i = 0; i < TOOL_LOOP_LIMIT; i++) {
    const response = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 1024,
      system: systemPrompt,
      messages: conversation,
      tools: [webSearchTool],
      tool_choice: {
        type: 'tool',
        name: WEB_SEARCH_TOOL_NAME,
        disable_parallel_tool_use: true
      }
    })

    conversation.push({
      role: 'assistant',
      content: response.content
    })

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === 'tool_use' && block.name === WEB_SEARCH_TOOL_NAME
    )

    if (!toolUses.length) {
      const baseText = getMessageTextContent(response)
      return appendSourcesIfMissing(
        baseText,
        buildSourcesMarkdown(latestResults)
      )
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const toolUse of toolUses) {
      const query =
        typeof (toolUse.input as { query?: unknown })?.query === 'string'
          ? ((toolUse.input as { query: string }).query || '').trim()
          : ''

      if (!query) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          is_error: true,
          content: 'Missing query for web search'
        })
        continue
      }

      try {
        const results = await searchWeb(query, {
          maxResults,
          timeoutMs
        })

        latestResults = results

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify({
            query,
            results
          })
        })
      } catch (error) {
        console.error('Web search tool failed:', error)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          is_error: true,
          content: 'Web search failed or timed out. Continue with best effort.'
        })
      }
    }

    conversation.push({
      role: 'user',
      content: toolResults
    })
  }

  const fallback = await anthropic.messages.create({
    model: selectedModel,
    max_tokens: 1024,
    system: systemPrompt,
    messages: conversation
  })
  const fallbackText = getMessageTextContent(fallback)
  return appendSourcesIfMissing(
    fallbackText,
    buildSourcesMarkdown(latestResults)
  )
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

    const hasTargetMessage = Boolean(
      body.targetMessageId && body.targetMessageContent
    )

    let currentUserMessage = body.message
    if (hasTargetMessage) {
      const customPromptInstruction = body.customPrompt
        ? `Custom instruction for the reply:\n${body.customPrompt}`
        : 'Write a natural, context-aware reply to the selected message.'

      currentUserMessage = [
        'You are drafting a chat reply for the user.',
        `Selected message to reply to:\n"""${body.targetMessageContent}"""`,
        customPromptInstruction,
        'Return only the final reply text the user should send.',
        'Do not include prefaces, labels, quotes, or explanations.'
      ].join('\n\n')
    }

    // Add the current user message
    messages.push({
      role: 'user',
      content: currentUserMessage
    })

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
      shouldUseWebSearch({
        userMessage: body.message,
        customPrompt: body.customPrompt,
        targetMessageContent: body.targetMessageContent
      })

    // Create streaming response with Anthropic
    const baseSystemPrompt =
      body.responseFormat === 'markdown'
        ? AI_STREAM_MARKDOWN_SYSTEM_PROMPT
        : AI_STREAM_SYSTEM_PROMPT
    const systemPrompt = searchNeeded
      ? `${baseSystemPrompt}\n\n${AI_WEB_SEARCH_INSTRUCTIONS}`
      : baseSystemPrompt

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

          if (searchNeeded) {
            fullResponse = await runToolEnabledGeneration({
              anthropic,
              selectedModel,
              systemPrompt,
              messages,
              maxResults: webSearchConfig.maxResults,
              timeoutMs: webSearchConfig.timeoutMs
            })

            enqueueContentByChunks(
              controller,
              encoder,
              tempMessageId,
              fullResponse
            )
          } else {
            const stream = anthropic.messages.stream({
              model: selectedModel,
              max_tokens: 1024,
              system: systemPrompt,
              messages
            })

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
          }

          const trimmedResponse = fullResponse.trim()
          let persistedMessageId = tempMessageId
          let persistedCreatedAt = new Date().toISOString()

          if (!body.draftOnly) {
            // Save complete message to database
            const aiMessage = await sendAIMessage({
              roomId: body.roomId,
              content: trimmedResponse,
              isPrivate: body.isPrivate || false,
              requesterId: body.userId
            })

            persistedMessageId = aiMessage.id
            persistedCreatedAt = aiMessage.createdAt

            if (body.triggerMessageId) {
              await markMessageAsAITrigger(body.triggerMessageId)
            }

            // Only broadcast public AI messages via Supabase Realtime
            // Private messages are only visible to the requesting user
            if (!body.isPrivate) {
              const broadcastMessage = {
                ...aiMessage,
                roomId: body.roomId,
                channelId: body.roomId,
                isAI: true,
                isPrivate: false
              }

              try {
                const supabaseService = getServiceClient()
                await supabaseService
                  .channel(body.roomId)
                  .httpSend('message', broadcastMessage)
              } catch (broadcastError) {
                // Fallback to the request-scoped client if service broadcast fails.
                try {
                  await supabase
                    .channel(body.roomId)
                    .httpSend('message', broadcastMessage)
                } catch (fallbackError) {
                  // Keep the stream successful for the requester even if broadcast fails.
                  console.error('AI broadcast failed (primary + fallback):', {
                    broadcastError,
                    fallbackError
                  })
                }
              }
            }
          }

          // Send completion with database info
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
