import ky from 'ky'
import type { ApiMessage, ChatMessage } from '@/lib/types/database'
import { getApiEndpointUrl } from '@/lib/api/endpoints'
import type {
  RoomsResponse,
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

export const getRooms = async (): Promise<RoomsResponse> => {
  return ky
    .get(getApiEndpointUrl('rooms.list', '/api/rooms'))
    .json<RoomsResponse>()
}

export const getRoomById = async (
  roomId: string,
  signal?: AbortSignal
): Promise<RoomByIdResponse> => {
  return ky
    .get(getApiEndpointUrl('rooms.byId', `/api/rooms/${roomId}`), {
      signal
    })
    .json<RoomByIdResponse>()
}

export const getMissedMessages = async (
  roomId: string,
  userId: string,
  signal?: AbortSignal
): Promise<MissedMessagesResponse> => {
  const searchParams = new URLSearchParams({ userId })

  return ky
    .get(
      getApiEndpointUrl(
        'rooms.rejoin',
        `/api/rooms/${roomId}/rejoin?${searchParams.toString()}`
      ),
      {
        signal
      }
    )
    .json<MissedMessagesResponse>()
}

export const sendMessage = async (
  data: SendMessageRequest
): Promise<SendMessageResponse> => {
  return ky
    .post(getApiEndpointUrl('messages.send', '/api/messages/send'), {
      json: data
    })
    .json<SendMessageResponse>()
}

export const unsendMessage = async (
  data: UnsendMessageRequest
): Promise<UnsendMessageResponse> => {
  return ky
    .post(getApiEndpointUrl('messages.unsend', '/api/messages/unsend'), {
      json: data
    })
    .json<UnsendMessageResponse>()
}

export const generateRoomSuggestion = async (
  data: GenerateRoomRequest
): Promise<GenerateRoomResponse> => {
  return ky
    .post(getApiEndpointUrl('rooms.generate', '/api/rooms/generate'), {
      json: data
    })
    .json<GenerateRoomResponse>()
}

export const markMessageAsReceived = async (
  data: MarkMessageAsReceivedRequest
): Promise<void> => {
  await ky.post(
    getApiEndpointUrl('messages.markReceived', '/api/messages/mark-received'),
    {
      json: data
    }
  )
}

export const streamAIMessage = async (
  data: StreamAIMessageRequest
): Promise<Response> => {
  return ky.post(getApiEndpointUrl('ai.stream', '/api/ai/stream'), {
    json: data
  })
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
