import Anthropic from '@anthropic-ai/sdk'
import { runAnthropicNativeSearchGeneration } from '@/lib/ai/anthropic-native-search'
import { type EffectiveAIFlags } from '@/lib/ai/feature-flags'
import {
  disableTavilyTemporarily,
  isTavilyTemporarilyDisabled,
  type WebSearchConfig
} from '@/lib/ai/stream-config'
import { runToolEnabledGeneration } from '@/lib/ai/stream-tool-generation'
import { runVercelSDKGeneration } from '@/lib/ai/vercel-sdk-generation'
import { isTavilyQuotaExceededError } from '@/lib/ai/web-search'

export type AIResponseGenerationResult =
  | {
      streamMode: 'native_stream'
      stream: AsyncIterable<Anthropic.RawMessageStreamEvent>
    }
  | {
      streamMode: 'chunked'
      fullResponse: string
    }

interface GenerateAIResponseParams {
  anthropic: Anthropic
  selectedModel: string
  systemPrompt: string
  messages: Anthropic.MessageParam[]
  flags: EffectiveAIFlags
  webSearchConfig: WebSearchConfig
  searchRequested: boolean
}

const isTavilyReady = () =>
  Boolean(process.env.TAVILY_API_KEY) && !isTavilyTemporarilyDisabled()

const streamAnthropicDirect = (
  anthropic: Anthropic,
  selectedModel: string,
  systemPrompt: string,
  messages: Anthropic.MessageParam[]
): AIResponseGenerationResult => ({
  streamMode: 'native_stream',
  stream: anthropic.messages.stream({
    model: selectedModel,
    max_tokens: 1024,
    system: systemPrompt,
    messages
  })
})

const generateWithTavily = async ({
  anthropic,
  selectedModel,
  systemPrompt,
  messages,
  webSearchConfig,
  searchRequested
}: GenerateAIResponseParams): Promise<AIResponseGenerationResult> => {
  if (!searchRequested || !isTavilyReady()) {
    return streamAnthropicDirect(anthropic, selectedModel, systemPrompt, messages)
  }

  try {
    const fullResponse = await runToolEnabledGeneration({
      anthropic,
      selectedModel,
      systemPrompt,
      messages,
      maxResults: webSearchConfig.maxResults,
      timeoutMs: webSearchConfig.timeoutMs
    })

    return {
      streamMode: 'chunked',
      fullResponse
    }
  } catch (error) {
    if (isTavilyQuotaExceededError(error)) {
      disableTavilyTemporarily(webSearchConfig.quotaCooldownMs)
      return streamAnthropicDirect(
        anthropic,
        selectedModel,
        systemPrompt,
        messages
      )
    }

    throw error
  }
}

const generateWithAnthropicNativeSearch = async ({
  anthropic,
  selectedModel,
  systemPrompt,
  messages,
  searchRequested
}: GenerateAIResponseParams): Promise<AIResponseGenerationResult> => {
  if (!searchRequested) {
    return streamAnthropicDirect(anthropic, selectedModel, systemPrompt, messages)
  }

  const fullResponse = await runAnthropicNativeSearchGeneration({
    anthropic,
    selectedModel,
    systemPrompt,
    messages
  })

  return {
    streamMode: 'chunked',
    fullResponse
  }
}

const generateWithVercelSDK = async ({
  anthropic,
  selectedModel,
  systemPrompt,
  messages,
  searchRequested,
  flags
}: GenerateAIResponseParams): Promise<AIResponseGenerationResult> => {
  try {
    const fullResponse = await runVercelSDKGeneration({
      selectedModel,
      systemPrompt,
      messages,
      useWebSearch: searchRequested,
      searchDriver: flags.searchDriver,
      failOpen: flags.failOpen
    })

    return {
      streamMode: 'chunked',
      fullResponse
    }
  } catch (sdkError) {
    if (!flags.failOpen) throw sdkError

    try {
      if (searchRequested) {
        const nativeFallback = await runAnthropicNativeSearchGeneration({
          anthropic,
          selectedModel,
          systemPrompt,
          messages
        })

        return {
          streamMode: 'chunked',
          fullResponse: nativeFallback
        }
      }
    } catch {
      // Fall through to baseline no-search streaming.
    }

    return streamAnthropicDirect(anthropic, selectedModel, systemPrompt, messages)
  }
}

export const generateAIResponse = async (
  params: GenerateAIResponseParams
): Promise<AIResponseGenerationResult> => {
  const { flags, searchRequested } = params

  const useSearch =
    params.webSearchConfig.enabled &&
    searchRequested &&
    (flags.searchDriver !== 'tavily' || Boolean(process.env.TAVILY_API_KEY))

  if (flags.backendMode === 'vercel_ai_sdk') {
    return generateWithVercelSDK({
      ...params,
      searchRequested: useSearch
    })
  }

  if (flags.backendMode === 'anthropic_native_web') {
    if (flags.searchDriver === 'tavily') {
      return generateWithTavily({
        ...params,
        searchRequested: useSearch
      })
    }

    return generateWithAnthropicNativeSearch({
      ...params,
      searchRequested: useSearch
    })
  }

  if (flags.searchDriver === 'anthropic_web_search') {
    return generateWithAnthropicNativeSearch({
      ...params,
      searchRequested: useSearch
    })
  }

  return generateWithTavily({
    ...params,
    searchRequested: useSearch
  })
}
