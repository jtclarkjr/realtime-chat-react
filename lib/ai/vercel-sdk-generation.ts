import Anthropic from '@anthropic-ai/sdk'
import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { generateText, type ModelMessage } from 'ai'
import { appendSourcesIfMissing } from '@/lib/ai/stream-sse'

const MAX_WEB_SEARCH_USES = 2

const toModelMessages = (
  messages: Anthropic.MessageParam[]
): ModelMessage[] =>
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

const generateWithSearch = async ({
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
    }
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
  failOpen
}: {
  selectedModel: string
  systemPrompt: string
  messages: Anthropic.MessageParam[]
  useWebSearch: boolean
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
    const result = await generateWithSearch({
      selectedModel,
      systemPrompt,
      messages
    })
    return appendSourcesIfMissing(result.text, buildSourcesMarkdown(result.sources))
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
