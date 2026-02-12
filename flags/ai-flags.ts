import { flag } from 'flags/next'
import type {
  AIBackendMode,
  AISDKProvider,
  AISearchDriver
} from '@/lib/ai/feature-flags'

const asBackendMode = (
  value: string | undefined
): AIBackendMode | undefined => {
  if (
    value === 'anthropic_tavily' ||
    value === 'anthropic_native_web' ||
    value === 'vercel_ai_sdk'
  ) {
    return value
  }
}

const asSearchDriver = (
  value: string | undefined
): AISearchDriver | undefined => {
  if (
    value === 'auto' ||
    value === 'tavily' ||
    value === 'anthropic_web_search'
  ) {
    return value
  }
}

const asSDKProvider = (
  value: string | undefined
): AISDKProvider | undefined => {
  if (value === 'anthropic') return value
}

const asBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

export const aiBackendModeFlag = flag<AIBackendMode>({
  key: 'ai-backend-mode',
  description: 'AI backend mode for /api/ai/stream routing.',
  options: ['anthropic_tavily', 'anthropic_native_web', 'vercel_ai_sdk'],
  defaultValue: 'anthropic_native_web',
  decide: () =>
    asBackendMode(process.env.AI_BACKEND_MODE) || 'anthropic_native_web'
})

export const aiSearchDriverFlag = flag<AISearchDriver>({
  key: 'ai-search-driver',
  description: 'Web search driver used by AI backend mode.',
  options: ['auto', 'tavily', 'anthropic_web_search'],
  defaultValue: 'auto',
  decide: () => asSearchDriver(process.env.AI_SEARCH_DRIVER) || 'auto'
})

export const aiFailOpenFlag = flag<boolean>({
  key: 'ai-flag-fail-open',
  description:
    'Fallback to safe defaults when AI flags are invalid/misconfigured.',
  options: [
    { label: 'On', value: true },
    { label: 'Off', value: false }
  ],
  defaultValue: true,
  decide: () => asBoolean(process.env.AI_FLAG_FAIL_OPEN, true)
})

export const aiSdkEnabledFlag = flag<boolean>({
  key: 'ai-sdk-enabled',
  description: 'Enables the vercel_ai_sdk backend mode.',
  options: [
    { label: 'On', value: true },
    { label: 'Off', value: false }
  ],
  defaultValue: false,
  decide: () => asBoolean(process.env.AI_SDK_ENABLED, false)
})

export const aiSdkProviderFlag = flag<AISDKProvider>({
  key: 'ai-sdk-provider',
  description: 'Provider used by Vercel AI SDK mode.',
  options: ['anthropic'],
  defaultValue: 'anthropic',
  decide: () => asSDKProvider(process.env.AI_SDK_PROVIDER) || 'anthropic'
})
