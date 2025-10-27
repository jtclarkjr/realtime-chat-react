import ky from 'ky'
import type { ApiMessage, ChatMessage } from '@/lib/types/database'
import type {
  RoomsResponse,
  MissedMessagesResponse,
  SendMessageRequest,
  SendMessageResponse,
  UnsendMessageRequest,
  UnsendMessageResponse,
  GenerateRoomRequest,
  GenerateRoomResponse
} from '@/lib/types/api'

class ApiClient {
  async getRooms(): Promise<RoomsResponse> {
    return ky.get('/api/rooms').json<RoomsResponse>()
  }

  async getMissedMessages(
    roomId: string,
    userId: string,
    signal?: AbortSignal
  ): Promise<MissedMessagesResponse> {
    return ky
      .get(`/api/rooms/${roomId}/rejoin?userId=${userId}`, {
        signal
      })
      .json<MissedMessagesResponse>()
  }

  async sendMessage(data: SendMessageRequest): Promise<SendMessageResponse> {
    return ky
      .post('/api/messages/send', {
        json: data
      })
      .json<SendMessageResponse>()
  }

  async unsendMessage(
    data: UnsendMessageRequest
  ): Promise<UnsendMessageResponse> {
    return ky
      .post('/api/messages/unsend', {
        json: data
      })
      .json<UnsendMessageResponse>()
  }

  async generateRoomSuggestion(
    data: GenerateRoomRequest
  ): Promise<GenerateRoomResponse> {
    return ky
      .post('/api/rooms/generate', {
        json: data
      })
      .json<GenerateRoomResponse>()
  }
}

export const apiClient = new ApiClient()

export function transformApiMessage(msg: ApiMessage): ChatMessage {
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
