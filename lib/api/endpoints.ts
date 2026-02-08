// Main use case is to have option to host API as a external outside of application layer

export type ApiEndpointKey =
  | 'rooms.list'
  | 'rooms.byId'
  | 'rooms.rejoin'
  | 'rooms.generate'
  | 'messages.send'
  | 'messages.unsend'
  | 'messages.markReceived'
  | 'ai.stream'

const endpointFlagEnvNames: Record<ApiEndpointKey, string> = {
  'rooms.list': 'NEXT_PUBLIC_USE_EXTERNAL_API_ROOMS_LIST',
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
const GLOBAL_EXTERNAL_API_FLAG_ENV = 'NEXT_PUBLIC_USE_EXTERNAL_API'

const truthyValues = new Set(['1', 'true', 'yes', 'on'])

const isEnabled = (value: string | undefined): boolean => {
  return Boolean(value && truthyValues.has(value.toLowerCase()))
}

const getEnvVar = (name: string): string | undefined => {
  return process.env[name]
}

export const shouldUseExternalApi = (endpoint: ApiEndpointKey): boolean => {
  const endpointFlag = getEnvVar(endpointFlagEnvNames[endpoint])
  if (endpointFlag !== undefined) {
    return isEnabled(endpointFlag)
  }

  return isEnabled(getEnvVar(GLOBAL_EXTERNAL_API_FLAG_ENV))
}

const normalizeBaseUrl = (baseUrl: string): string =>
  baseUrl.replace(/\/+$/, '')

export const getApiEndpointUrl = (
  endpoint: ApiEndpointKey,
  path: string
): string => {
  if (!shouldUseExternalApi(endpoint)) {
    return path
  }

  const externalBaseUrl = getEnvVar(EXTERNAL_API_BASE_URL_ENV)
  if (!externalBaseUrl) {
    return path
  }

  return `${normalizeBaseUrl(externalBaseUrl)}${path}`
}
