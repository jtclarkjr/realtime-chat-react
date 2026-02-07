import ky from 'ky'
import type { ApiMessage, ChatMessage } from '@/lib/types/database'
import type {
  RoomsResponse,
  RoomByIdResponse,
  MissedMessagesResponse,
  SendMessageRequest,
  SendMessageResponse,
  UnsendMessageRequest,
  UnsendMessageResponse,
  GenerateRoomRequest,
  GenerateRoomResponse
} from '@/lib/types/api'

export const getRooms = async (): Promise<RoomsResponse> => {
  return ky.get('/api/rooms').json<RoomsResponse>()
}

export const getRoomById = async (
  roomId: string,
  signal?: AbortSignal
): Promise<RoomByIdResponse> => {
  return ky
    .get(`/api/rooms/${roomId}`, {
      signal
    })
    .json<RoomByIdResponse>()
}

export const getMissedMessages = async (
  roomId: string,
  userId: string,
  signal?: AbortSignal
): Promise<MissedMessagesResponse> => {
  return ky
    .get(`/api/rooms/${roomId}/rejoin?userId=${userId}`, {
      signal
    })
    .json<MissedMessagesResponse>()
}

export const sendMessage = async (
  data: SendMessageRequest
): Promise<SendMessageResponse> => {
  return ky
    .post('/api/messages/send', {
      json: data
    })
    .json<SendMessageResponse>()
}

export const unsendMessage = async (
  data: UnsendMessageRequest
): Promise<UnsendMessageResponse> => {
  return ky
    .post('/api/messages/unsend', {
      json: data
    })
    .json<UnsendMessageResponse>()
}

export const generateRoomSuggestion = async (
  data: GenerateRoomRequest
): Promise<GenerateRoomResponse> => {
  return ky
    .post('/api/rooms/generate', {
      json: data
    })
    .json<GenerateRoomResponse>()
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
    isPending: false,
    isQueued: false,
    isRetrying: false,
    isFailed: false
  }
}
