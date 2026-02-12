import {
  aiBackendModeFlag,
  aiFailOpenFlag,
  aiSdkEnabledFlag,
  aiSdkProviderFlag,
  aiSearchDriverFlag
} from '@/flags/ai-flags'
import {
  type AIBackendMode,
  type AISDKProvider,
  type AISearchDriver,
  type EffectiveAIFlags,
  resolveEffectiveAIFlags
} from '@/lib/ai/feature-flags'

type AIFeatureFlagsMigrationMode = 'shadow' | 'active'

const DEFAULT_BACKEND_MODE: AIBackendMode = 'anthropic_native_web'
const DEFAULT_SEARCH_DRIVER: AISearchDriver = 'auto'
const DEFAULT_PROVIDER: AISDKProvider = 'anthropic'

const asValidBackendMode = (value: unknown): AIBackendMode | null => {
  if (
    value === 'anthropic_tavily' ||
    value === 'anthropic_native_web' ||
    value === 'vercel_ai_sdk'
  ) {
    return value
  }
  return null
}

const asValidSearchDriver = (value: unknown): AISearchDriver | null => {
  if (
    value === 'auto' ||
    value === 'tavily' ||
    value === 'anthropic_web_search'
  ) {
    return value
  }
  return null
}

const asValidSDKProvider = (value: unknown): AISDKProvider | null => {
  if (value === 'anthropic') return value
  return null
}

const resolveAutoDriver = (
  backendMode: AIBackendMode
): Exclude<AISearchDriver, 'auto'> => {
  if (backendMode === 'anthropic_tavily') return 'tavily'
  return 'anthropic_web_search'
}

const getMigrationMode = (
  env: NodeJS.ProcessEnv
): AIFeatureFlagsMigrationMode => {
  if (env.AI_FLAGS_MIGRATION_MODE === 'active') return 'active'
  return 'shadow'
}

const normalizeForDiff = (value: EffectiveAIFlags) => ({
  backendMode: value.backendMode,
  searchDriver: value.searchDriver,
  provider: value.provider,
  failOpen: value.failOpen,
  sdkEnabled: value.sdkEnabled
})

const areFlagsEquivalent = (a: EffectiveAIFlags, b: EffectiveAIFlags) => {
  const left = normalizeForDiff(a)
  const right = normalizeForDiff(b)
  return JSON.stringify(left) === JSON.stringify(right)
}

const resolveFromFlagsSDK = async (): Promise<EffectiveAIFlags> => {
  const [backendRaw, searchRaw, failOpen, sdkEnabled, providerRaw] =
    await Promise.all([
      aiBackendModeFlag(),
      aiSearchDriverFlag(),
      aiFailOpenFlag(),
      aiSdkEnabledFlag(),
      aiSdkProviderFlag()
    ])

  const reasons: string[] = []
  let fallbackApplied = false

  const backendMode = asValidBackendMode(backendRaw)
  const provider = asValidSDKProvider(providerRaw)
  const searchDriver = asValidSearchDriver(searchRaw)

  let resolvedBackendMode = backendMode || DEFAULT_BACKEND_MODE
  const resolvedProvider = provider || DEFAULT_PROVIDER
  let resolvedSearchDriverRaw = searchDriver || DEFAULT_SEARCH_DRIVER

  if (!backendMode) {
    fallbackApplied = true
    reasons.push(`Invalid AI backend flag value "${String(backendRaw)}"`)
  }

  if (!provider) {
    fallbackApplied = true
    reasons.push(`Invalid AI SDK provider flag value "${String(providerRaw)}"`)
  }

  if (!searchDriver) {
    fallbackApplied = true
    reasons.push(`Invalid AI search driver flag value "${String(searchRaw)}"`)
  }

  if (resolvedBackendMode === 'vercel_ai_sdk' && !sdkEnabled) {
    if (failOpen) {
      fallbackApplied = true
      reasons.push('AI_SDK_ENABLED=false')
      resolvedBackendMode = DEFAULT_BACKEND_MODE
      resolvedSearchDriverRaw = DEFAULT_SEARCH_DRIVER
    } else {
      throw new Error('AI_SDK_ENABLED=false but AI_BACKEND_MODE=vercel_ai_sdk')
    }
  }

  const resolvedSearchDriver =
    resolvedSearchDriverRaw === 'auto'
      ? resolveAutoDriver(resolvedBackendMode)
      : resolvedSearchDriverRaw

  return {
    backendMode: resolvedBackendMode,
    searchDriver: resolvedSearchDriver,
    provider: resolvedProvider,
    failOpen,
    sdkEnabled,
    fallbackApplied,
    reason: reasons.join('; ') || undefined
  }
}

export const getEffectiveAIFlags = async (
  env: NodeJS.ProcessEnv = process.env
): Promise<EffectiveAIFlags> => {
  const migrationMode = getMigrationMode(env)

  if (migrationMode === 'active') {
    return resolveFromFlagsSDK()
  }

  const legacyFlags = resolveEffectiveAIFlags(env)

  try {
    const runtimeFlags = await resolveFromFlagsSDK()
    if (!areFlagsEquivalent(legacyFlags, runtimeFlags)) {
      console.warn('AI flags shadow mismatch', {
        legacy: normalizeForDiff(legacyFlags),
        runtime: normalizeForDiff(runtimeFlags),
        legacyReason: legacyFlags.reason,
        runtimeReason: runtimeFlags.reason
      })
    }
  } catch (error) {
    console.warn('AI flags shadow runtime evaluation failed', error)
  }

  return legacyFlags
}
