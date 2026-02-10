import Anthropic from '@anthropic-ai/sdk'
import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { tavilySearch } from '@tavily/ai-sdk'
import { generateText, stepCountIs, type ModelMessage } from 'ai'
import { appendSourcesIfMissing } from '@/lib/ai/stream-sse'
import type { AISearchDriver } from '@/lib/ai/feature-flags'

const MAX_WEB_SEARCH_USES = 2
const TOOL_STEP_LIMIT = 3

const toModelMessages = (messages: Anthropic.MessageParam[]): ModelMessage[] =>
  messages
    .filter(
      (
        message
      ): message is Anthropic.MessageParam & {
        role: 'user' | 'assistant'
        content: string
      } =>
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string'
    )
    .map((message) => ({
      role: message.role,
      content: message.content
    }))

const buildSourcesMarkdown = (
  sources: Awaited<ReturnType<typeof generateText>>['sources']
): string => {
  const links: string[] = []
  const seen = new Set<string>()

  for (const source of sources) {
    if (source.type !== 'source' || source.sourceType !== 'url') continue
    const url = (source.url || '').trim()
    if (!url || seen.has(url)) continue

    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        continue
      }
    } catch {
      continue
    }

    const title = (source.title || url).replace(/\[|\]/g, '')
    seen.add(url)
    links.push(`[${title}](${url})`)
    if (links.length >= 3) break
  }

  if (!links.length) return ''
  return `Sources: ${links.join(' | ')}`
}

const generateWithAnthropicNativeSearch = async ({
  selectedModel,
  systemPrompt,
  messages
}: {
  selectedModel: string
  systemPrompt: string
  messages: Anthropic.MessageParam[]
}) => {
  return generateText({
    model: anthropicProvider(selectedModel),
    system: systemPrompt,
    messages: toModelMessages(messages),
    maxOutputTokens: 1024,
    tools: {
      web_search: anthropicProvider.tools.webSearch_20250305({
        maxUses: MAX_WEB_SEARCH_USES
      })
    },
    stopWhen: stepCountIs(TOOL_STEP_LIMIT)
  })
}

const generateWithTavilySearch = async ({
  selectedModel,
  systemPrompt,
  messages
}: {
  selectedModel: string
  systemPrompt: string
  messages: Anthropic.MessageParam[]
}) => {
  return generateText({
    model: anthropicProvider(selectedModel),
    system: systemPrompt,
    messages: toModelMessages(messages),
    maxOutputTokens: 1024,
    tools: {
      web_search: tavilySearch()
    },
    stopWhen: stepCountIs(TOOL_STEP_LIMIT)
  })
}

const generateWithoutSearch = async ({
  selectedModel,
  systemPrompt,
  messages
}: {
  selectedModel: string
  systemPrompt: string
  messages: Anthropic.MessageParam[]
}) => {
  return generateText({
    model: anthropicProvider(selectedModel),
    system: systemPrompt,
    messages: toModelMessages(messages),
    maxOutputTokens: 1024
  })
}

export const runVercelSDKGeneration = async ({
  selectedModel,
  systemPrompt,
  messages,
  useWebSearch,
  searchDriver,
  failOpen
}: {
  selectedModel: string
  systemPrompt: string
  messages: Anthropic.MessageParam[]
  useWebSearch: boolean
  searchDriver: Exclude<AISearchDriver, 'auto'>
  failOpen: boolean
}): Promise<string> => {
  if (!useWebSearch) {
    const result = await generateWithoutSearch({
      selectedModel,
      systemPrompt,
      messages
    })
    return result.text
  }

  try {
    const result =
      searchDriver === 'tavily'
        ? await generateWithTavilySearch({
            selectedModel,
            systemPrompt,
            messages
          })
        : await generateWithAnthropicNativeSearch({
            selectedModel,
            systemPrompt,
            messages
          })
    return appendSourcesIfMissing(
      result.text,
      buildSourcesMarkdown(result.sources)
    )
  } catch (error) {
    if (!failOpen) throw error

    const fallback = await generateWithoutSearch({
      selectedModel,
      systemPrompt,
      messages
    })

    return fallback.text
  }
}
