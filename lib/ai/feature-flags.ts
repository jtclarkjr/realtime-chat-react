export type AIBackendMode =
  | 'anthropic_tavily'
  | 'anthropic_native_web'
  | 'vercel_ai_sdk'
export type AISearchDriver = 'tavily' | 'anthropic_web_search' | 'auto'
export type AISDKProvider = 'anthropic'

export interface EffectiveAIFlags {
  backendMode: AIBackendMode
  searchDriver: Exclude<AISearchDriver, 'auto'>
  provider: AISDKProvider
  failOpen: boolean
  sdkEnabled: boolean
  fallbackApplied: boolean
  reason?: string
}

const DEFAULT_BACKEND_MODE: AIBackendMode = 'anthropic_native_web'
const DEFAULT_PROVIDER: AISDKProvider = 'anthropic'
const DEFAULT_SEARCH_DRIVER: AISearchDriver = 'auto'
const VALID_BACKEND_MODES = new Set<AIBackendMode>([
  'anthropic_tavily',
  'anthropic_native_web',
  'vercel_ai_sdk'
])
const VALID_SEARCH_DRIVERS = new Set<AISearchDriver>([
  'tavily',
  'anthropic_web_search',
  'auto'
])
const VALID_SDK_PROVIDERS = new Set<AISDKProvider>(['anthropic'])

const parseBool = (value: string | undefined, fallback: boolean) => {
  if (!value) return fallback
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

const resolveAutoDriver = (
  backendMode: AIBackendMode
): Exclude<AISearchDriver, 'auto'> => {
  if (backendMode === 'anthropic_tavily') return 'tavily'
  return 'anthropic_web_search'
}

const asValidBackendMode = (
  value: string | undefined
): AIBackendMode | null => {
  if (!value) return null
  if (VALID_BACKEND_MODES.has(value as AIBackendMode))
    return value as AIBackendMode
  return null
}

const asValidSearchDriver = (
  value: string | undefined
): AISearchDriver | null => {
  if (!value) return null
  if (VALID_SEARCH_DRIVERS.has(value as AISearchDriver)) {
    return value as AISearchDriver
  }
  return null
}

const asValidSDKProvider = (
  value: string | undefined
): AISDKProvider | null => {
  if (!value) return null
  if (VALID_SDK_PROVIDERS.has(value as AISDKProvider)) {
    return value as AISDKProvider
  }
  return null
}

export const resolveEffectiveAIFlags = (
  env: NodeJS.ProcessEnv = process.env
): EffectiveAIFlags => {
  const failOpen = parseBool(env.AI_FLAG_FAIL_OPEN, true)
  const sdkEnabled = parseBool(env.AI_SDK_ENABLED, false)

  const requestedBackend = asValidBackendMode(env.AI_BACKEND_MODE)
  const requestedDriver = asValidSearchDriver(env.AI_SEARCH_DRIVER)
  const requestedProvider = asValidSDKProvider(env.AI_SDK_PROVIDER)
  const provider = requestedProvider || DEFAULT_PROVIDER

  let backendMode = requestedBackend || DEFAULT_BACKEND_MODE
  let searchDriverRaw: AISearchDriver = requestedDriver || DEFAULT_SEARCH_DRIVER
  let fallbackApplied = false
  let reason: string | undefined

  if (!requestedBackend && env.AI_BACKEND_MODE) {
    fallbackApplied = true
    reason = `Invalid AI_BACKEND_MODE "${env.AI_BACKEND_MODE}"`
  }

  if (!requestedDriver && env.AI_SEARCH_DRIVER) {
    fallbackApplied = true
    reason = reason
      ? `${reason}; Invalid AI_SEARCH_DRIVER "${env.AI_SEARCH_DRIVER}"`
      : `Invalid AI_SEARCH_DRIVER "${env.AI_SEARCH_DRIVER}"`
  }

  if (!requestedProvider && env.AI_SDK_PROVIDER) {
    fallbackApplied = true
    reason = reason
      ? `${reason}; Invalid AI_SDK_PROVIDER "${env.AI_SDK_PROVIDER}"`
      : `Invalid AI_SDK_PROVIDER "${env.AI_SDK_PROVIDER}"`
  }

  if (backendMode === 'vercel_ai_sdk' && !sdkEnabled) {
    if (failOpen) {
      backendMode = DEFAULT_BACKEND_MODE
      fallbackApplied = true
      reason = reason
        ? `${reason}; AI_SDK_ENABLED=false`
        : 'AI_SDK_ENABLED=false'
      searchDriverRaw = 'auto'
    } else {
      throw new Error('AI_SDK_ENABLED=false but AI_BACKEND_MODE=vercel_ai_sdk')
    }
  }

  const resolvedSearchDriver =
    searchDriverRaw === 'auto'
      ? resolveAutoDriver(backendMode)
      : searchDriverRaw

  return {
    backendMode,
    searchDriver: resolvedSearchDriver,
    provider,
    failOpen,
    sdkEnabled,
    fallbackApplied,
    reason
  }
}
