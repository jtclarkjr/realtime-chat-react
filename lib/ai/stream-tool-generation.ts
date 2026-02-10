import Anthropic from '@anthropic-ai/sdk'
import {
  buildSourcesMarkdown,
  isTavilyQuotaExceededError,
  searchWeb
} from '@/lib/ai/web-search'
import {
  WEB_SEARCH_QUERY_FIELD_DESCRIPTION,
  WEB_SEARCH_TOOL_DESCRIPTION,
  WEB_SEARCH_TOOL_NAME
} from '@/lib/ai/constants'
import {
  appendSourcesIfMissing,
  getMessageTextContent
} from '@/lib/ai/stream-sse'

const TOOL_LOOP_LIMIT = 2

const getWebSearchToolDefinition = (): Anthropic.Tool => ({
  name: WEB_SEARCH_TOOL_NAME,
  description: WEB_SEARCH_TOOL_DESCRIPTION,
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: WEB_SEARCH_QUERY_FIELD_DESCRIPTION
      }
    },
    required: ['query']
  }
})

export const runToolEnabledGeneration = async ({
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
        if (isTavilyQuotaExceededError(error)) {
          throw error
        }
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
