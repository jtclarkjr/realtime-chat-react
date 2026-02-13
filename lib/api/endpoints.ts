// Main use case is to have option to host API as a external outside of application layer

export type ApiEndpointKey =
  | 'rooms.list'
  | 'rooms.create'
  | 'rooms.delete'
  | 'rooms.byId'
  | 'rooms.rejoin'
  | 'rooms.generate'
  | 'messages.send'
  | 'messages.unsend'
  | 'messages.markReceived'
  | 'ai.stream'

const endpointFlagEnvNames: Record<ApiEndpointKey, string> = {
  'rooms.list': 'NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_LIST',
  'rooms.create': 'NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_CREATE',
  'rooms.delete': 'NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_DELETE',
  'rooms.byId': 'NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_BY_ID',
  'rooms.rejoin': 'NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_REJOIN',
  'rooms.generate': 'NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_GENERATE',
  'messages.send': 'NEXT_PUBLIC_USE_EXTERNAL_API_MESSAGES_SEND',
  'messages.unsend': 'NEXT_PUBLIC_USE_EXTERNAL_API_MESSAGES_UNSEND',
  'messages.markReceived':
    'NEXT_PUBLIC_USE_EXTERNAL_API_MESSAGES_MARK_RECEIVED',
  'ai.stream': 'NEXT_PUBLIC_USE_EXTERNAL_API_AI_STREAM'
}

const EXTERNAL_API_BASE_URL_ENV = 'NEXT_PUBLIC_EXTERNAL_API_BASE_URL'
const EXTERNAL_API_URL_ENV = 'NEXT_PUBLIC_EXTERNAL_API_URL'
const GLOBAL_EXTERNAL_API_FLAG_ENV = 'NEXT_PUBLIC_USE_EXTERNAL_API'

const truthyValues = new Set(['1', 'true', 'yes', 'on'])

const isEnabled = (value: string | undefined): boolean => {
  return Boolean(value && truthyValues.has(value.toLowerCase()))
}

const publicEnv = {
  NEXT_PUBLIC_USE_EXTERNAL_API: process.env.NEXT_PUBLIC_USE_EXTERNAL_API,
  NEXT_PUBLIC_EXTERNAL_API_BASE_URL:
    process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL,
  NEXT_PUBLIC_EXTERNAL_API_URL: process.env.NEXT_PUBLIC_EXTERNAL_API_URL,
  NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_LIST:
    process.env.NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_LIST,
  NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_CREATE:
    process.env.NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_CREATE,
  NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_DELETE:
    process.env.NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_DELETE,
  NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_BY_ID:
    process.env.NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_BY_ID,
  NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_REJOIN:
    process.env.NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_REJOIN,
  NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_GENERATE:
    process.env.NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_GENERATE,
  NEXT_PUBLIC_USE_EXTERNAL_API_MESSAGES_SEND:
    process.env.NEXT_PUBLIC_USE_EXTERNAL_API_MESSAGES_SEND,
  NEXT_PUBLIC_USE_EXTERNAL_API_MESSAGES_UNSEND:
    process.env.NEXT_PUBLIC_USE_EXTERNAL_API_MESSAGES_UNSEND,
  NEXT_PUBLIC_USE_EXTERNAL_API_MESSAGES_MARK_RECEIVED:
    process.env.NEXT_PUBLIC_USE_EXTERNAL_API_MESSAGES_MARK_RECEIVED,
  NEXT_PUBLIC_USE_EXTERNAL_API_AI_STREAM:
    process.env.NEXT_PUBLIC_USE_EXTERNAL_API_AI_STREAM
} as const

const getEnvVar = (name: string): string | undefined => {
  return publicEnv[name as keyof typeof publicEnv]
}

export const shouldUseExternalApi = (endpoint: ApiEndpointKey): boolean => {
  const endpointFlag = getEnvVar(endpointFlagEnvNames[endpoint])
  const globalFlag = getEnvVar(GLOBAL_EXTERNAL_API_FLAG_ENV)

  return endpointFlag !== undefined
    ? isEnabled(endpointFlag)
    : isEnabled(globalFlag)
}

const normalizeBaseUrl = (baseUrl: string): string =>
  baseUrl.replace(/\/+$/, '')

const normalizePath = (path: string): string => {
  if (!path.startsWith('/')) {
    return `/${path}`
  }
  return path
}

const resolveExternalPath = (baseUrl: string, path: string): string => {
  const normalizedPath = normalizePath(path)
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

  if (!normalizedPath.startsWith('/api')) {
    return normalizedPath
  }

  const baseIncludesExternalApi = /\/v1\/external\/api$/i.test(
    normalizedBaseUrl
  )
  const baseIncludesExternal = /\/v1\/external$/i.test(normalizedBaseUrl)

  if (baseIncludesExternalApi) {
    return normalizedPath.replace(/^\/api/i, '')
  }

  if (baseIncludesExternal) {
    return normalizedPath
  }

  return `/v1/external${normalizedPath}`
}

const getExternalBaseUrl = (): string | undefined => {
  // Support both names to stay compatible with docs/config from sibling services.
  return getEnvVar(EXTERNAL_API_BASE_URL_ENV) || getEnvVar(EXTERNAL_API_URL_ENV)
}

export const getApiEndpointUrl = (
  endpoint: ApiEndpointKey,
  path: string
): string => {
  if (!shouldUseExternalApi(endpoint)) {
    return path
  }

  const externalBaseUrl = getExternalBaseUrl()
  if (!externalBaseUrl) {
    return path
  }

  return `${normalizeBaseUrl(externalBaseUrl)}${resolveExternalPath(externalBaseUrl, path)}`
}
