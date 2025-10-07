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
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: `status: ${response.status}`
      }))
      throw new Error(error.error || `status: ${response.status}`)
    }

    return response.json()
  }

  async getRooms(): Promise<RoomsResponse> {
    return this.request<RoomsResponse>('/api/rooms')
  }

  async getMissedMessages(
    roomId: string,
    userId: string,
    signal?: AbortSignal
  ): Promise<MissedMessagesResponse> {
    return this.request<MissedMessagesResponse>(
      `/api/rooms/${roomId}/rejoin?userId=${userId}`,
      { signal }
    )
  }

  async sendMessage(data: SendMessageRequest): Promise<SendMessageResponse> {
    return this.request<SendMessageResponse>('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async unsendMessage(
    data: UnsendMessageRequest
  ): Promise<UnsendMessageResponse> {
    return this.request<UnsendMessageResponse>('/api/messages/unsend', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async generateRoomSuggestion(
    data: GenerateRoomRequest
  ): Promise<GenerateRoomResponse> {
    return this.request<GenerateRoomResponse>('/api/rooms/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    })
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
