import Anthropic from '@anthropic-ai/sdk'
import {
  appendSourcesIfMissing,
  getMessageTextContent
} from '@/lib/ai/stream-sse'

const NATIVE_WEB_SEARCH_TOOL_NAME = 'web_search'
const NATIVE_WEB_SEARCH_MAX_USES = 2

const toSourcesMarkdown = (response: Anthropic.Message): string => {
  const seen = new Set<string>()
  const links: string[] = []

  for (const block of response.content) {
    if (block.type !== 'web_search_tool_result') continue
    if (!Array.isArray(block.content)) continue

    for (const item of block.content) {
      if (item.type !== 'web_search_result') continue
      const title = (item.title || '').trim().replace(/\[|\]/g, '')
      const url = (item.url || '').trim()
      if (!title || !url || seen.has(url)) continue

      try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          continue
        }
      } catch {
        continue
      }

      seen.add(url)
      links.push(`[${title}](${url})`)
      if (links.length >= 3) break
    }

    if (links.length >= 3) break
  }

  if (!links.length) return ''
  return `Sources: ${links.join(' | ')}`
}

export const runAnthropicNativeSearchGeneration = async ({
  anthropic,
  selectedModel,
  systemPrompt,
  messages
}: {
  anthropic: Anthropic
  selectedModel: string
  systemPrompt: string
  messages: Anthropic.MessageParam[]
}): Promise<string> => {
  const response = await anthropic.messages.create({
    model: selectedModel,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
    tools: [
      {
        name: NATIVE_WEB_SEARCH_TOOL_NAME,
        type: 'web_search_20250305',
        max_uses: NATIVE_WEB_SEARCH_MAX_USES
      }
    ]
  })

  const text = getMessageTextContent(response)
  return appendSourcesIfMissing(text, toSourcesMarkdown(response))
}
