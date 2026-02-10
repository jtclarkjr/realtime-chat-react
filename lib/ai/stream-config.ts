const getParsedPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export interface WebSearchConfig {
  enabled: boolean
  maxResults: number
  timeoutMs: number
  quotaCooldownMs: number
}

let tavilyDisabledUntil = 0

export const getWebSearchConfig = (): WebSearchConfig => ({
  enabled: process.env.AI_WEB_SEARCH_ENABLED !== 'false',
  maxResults: getParsedPositiveInt(process.env.AI_WEB_SEARCH_MAX_RESULTS, 5),
  timeoutMs: getParsedPositiveInt(process.env.AI_WEB_SEARCH_TIMEOUT_MS, 6000),
  quotaCooldownMs: getParsedPositiveInt(
    process.env.AI_WEB_SEARCH_QUOTA_COOLDOWN_MS,
    3600000
  )
})

export const getCurrentDateContext = () => {
  const now = new Date()
  return {
    nowIso: now.toISOString(),
    nowUtc: now.toUTCString()
  }
}

export const isTavilyTemporarilyDisabled = () =>
  Date.now() < tavilyDisabledUntil

export const disableTavilyTemporarily = (cooldownMs: number) => {
  tavilyDisabledUntil = Date.now() + cooldownMs
}
