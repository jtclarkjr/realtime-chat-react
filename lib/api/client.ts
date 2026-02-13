import ky from 'ky'
import type { Options } from 'ky'
import type { ApiMessage, ChatMessage } from '@/lib/types/database'
import { getApiEndpointUrl, shouldUseExternalApi } from '@/lib/api/endpoints'
import type {
  AccessTokenResponse,
  RoomsResponse,
  CreateRoomRequest,
  CreateRoomResponse,
  DeleteRoomResponse,
  RoomByIdResponse,
  MissedMessagesResponse,
  SendMessageRequest,
  SendMessageResponse,
  UnsendMessageRequest,
  UnsendMessageResponse,
  GenerateRoomRequest,
  GenerateRoomResponse,
  MarkMessageAsReceivedRequest,
  StreamAIMessageRequest
} from '@/lib/types/api'

let cachedAccessToken: string | null = null
let cachedAccessTokenExpiresAtMs = 0
let accessTokenRequest: Promise<string | null> | null = null

const getAccessToken = async (): Promise<string | null> => {
  const now = Date.now()
  const refreshSkewMs = 10_000

  if (cachedAccessToken && cachedAccessTokenExpiresAtMs > now + refreshSkewMs) {
    return cachedAccessToken
  }

  if (accessTokenRequest) {
    return accessTokenRequest
  }

  accessTokenRequest = (async () => {
    const response = await ky.get('/api/auth/access-token', {
      cache: 'no-store'
    })

    if (!response.ok) {
      cachedAccessToken = null
      cachedAccessTokenExpiresAtMs = 0
      return null
    }

    const data = await response.json<AccessTokenResponse>()
    cachedAccessToken = data.accessToken || null
    cachedAccessTokenExpiresAtMs = data.expiresAtMs ?? now + 60_000
    return cachedAccessToken
  })()
    .catch(() => {
      cachedAccessToken = null
      cachedAccessTokenExpiresAtMs = 0
      return null
    })
    .finally(() => {
      accessTokenRequest = null
    })

  return accessTokenRequest
}

const withExternalAuth = async (
  endpoint: Parameters<typeof getApiEndpointUrl>[0],
  options: Options = {}
): Promise<Options> => {
  if (!shouldUseExternalApi(endpoint)) {
    return options
  }

  const token = await getAccessToken()
  if (!token) {
    throw new Error('External API auth token unavailable')
  }

  const headers = new Headers()
  const existingHeaders = options.headers

  if (existingHeaders instanceof Headers) {
    existingHeaders.forEach((value, key) => headers.set(key, value))
  } else if (Array.isArray(existingHeaders)) {
    existingHeaders.forEach(([key, value]) => headers.set(key, value))
  } else if (existingHeaders) {
    Object.entries(existingHeaders).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers.set(key, value)
      }
    })
  }

  headers.set('Authorization', `Bearer ${token}`)

  return {
    ...options,
    headers
  }
}

export const getRooms = async (): Promise<RoomsResponse> => {
  const endpoint = 'rooms.list'
  const url = getApiEndpointUrl(endpoint, '/api/rooms')
  return ky.get(url, await withExternalAuth(endpoint)).json<RoomsResponse>()
}

export const getRoomById = async (
  roomId: string,
  signal?: AbortSignal
): Promise<RoomByIdResponse> => {
  const endpoint = 'rooms.byId'
  return ky
    .get(
      getApiEndpointUrl(endpoint, `/api/rooms/${roomId}`),
      await withExternalAuth(endpoint, { signal })
    )
    .json<RoomByIdResponse>()
}

export const createRoom = async (
  data: CreateRoomRequest
): Promise<CreateRoomResponse> => {
  const endpoint = 'rooms.create'
  const response = await ky
    .post(
      getApiEndpointUrl(endpoint, '/api/rooms'),
      await withExternalAuth(endpoint, { json: data })
    )
    .json<{ room: CreateRoomResponse['room'] }>()

  return {
    success: true,
    room: response.room
  }
}

export const deleteRoom = async (
  roomId: string
): Promise<DeleteRoomResponse> => {
  const endpoint = 'rooms.delete'
  const searchParams = new URLSearchParams({ id: roomId })
  return ky
    .delete(
      getApiEndpointUrl(endpoint, `/api/rooms?${searchParams.toString()}`),
      await withExternalAuth(endpoint)
    )
    .json<DeleteRoomResponse>()
}

export const getMissedMessages = async (
  roomId: string,
  userId: string,
  signal?: AbortSignal
): Promise<MissedMessagesResponse> => {
  const endpoint = 'rooms.rejoin'
  const searchParams = new URLSearchParams({ userId })

  return ky
    .get(
      getApiEndpointUrl(
        endpoint,
        `/api/rooms/${roomId}/rejoin?${searchParams.toString()}`
      ),
      await withExternalAuth(endpoint, {
        signal
      })
    )
    .json<MissedMessagesResponse>()
}

export const sendMessage = async (
  data: SendMessageRequest
): Promise<SendMessageResponse> => {
  const endpoint = 'messages.send'
  return ky
    .post(
      getApiEndpointUrl(endpoint, '/api/messages/send'),
      await withExternalAuth(endpoint, {
        json: data
      })
    )
    .json<SendMessageResponse>()
}

export const unsendMessage = async (
  data: UnsendMessageRequest
): Promise<UnsendMessageResponse> => {
  const endpoint = 'messages.unsend'
  return ky
    .post(
      getApiEndpointUrl(endpoint, '/api/messages/unsend'),
      await withExternalAuth(endpoint, {
        json: data
      })
    )
    .json<UnsendMessageResponse>()
}

export const generateRoomSuggestion = async (
  data: GenerateRoomRequest
): Promise<GenerateRoomResponse> => {
  const endpoint = 'rooms.generate'
  return ky
    .post(
      getApiEndpointUrl(endpoint, '/api/rooms/generate'),
      await withExternalAuth(endpoint, {
        json: data
      })
    )
    .json<GenerateRoomResponse>()
}

export const markMessageAsReceived = async (
  data: MarkMessageAsReceivedRequest
): Promise<void> => {
  const endpoint = 'messages.markReceived'
  await ky.post(
    getApiEndpointUrl(endpoint, '/api/messages/mark-received'),
    await withExternalAuth(endpoint, {
      json: data
    })
  )
}

export const streamAIMessage = async (
  data: StreamAIMessageRequest
): Promise<Response> => {
  const endpoint = 'ai.stream'
  return ky.post(
    getApiEndpointUrl(endpoint, '/api/ai/stream'),
    await withExternalAuth(endpoint, {
      json: data
    })
  )
}

export const transformApiMessage = (msg: ApiMessage): ChatMessage => {
  return {
    id: msg.id,
    content: msg.content,
    user: {
      id: msg.user.id,
      name: msg.user.name,
      avatar_url: msg.user.avatar_url
    },
    createdAt: msg.createdAt,
    roomId: msg.channelId,
    isAI: msg.isAI || false,
    isPrivate: msg.isPrivate || false,
    requesterId: msg.requesterId,
    isDeleted: msg.isDeleted || false,
    deletedAt: msg.deletedAt,
    deletedBy: msg.deletedBy,
    hasAIResponse: msg.hasAIResponse || false,
    clientMsgId: msg.clientMsgId,
    streamSourceId: msg.streamSourceId,
    isPending: false,
    isQueued: false,
    isRetrying: false,
    isFailed: false
  }
}
