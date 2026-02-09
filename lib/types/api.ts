import type {
  DatabaseRoom,
  ApiMessage,
  SendMessageRequest as DB_SendMessageRequest,
  UnsendMessageRequest as DB_UnsendMessageRequest
} from './database'

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// GET /api/rooms - Fetch all rooms
export interface RoomsResponse {
  rooms: DatabaseRoom[]
}

// GET /api/rooms/{roomId} - Fetch room by ID
export interface RoomByIdResponse {
  room: DatabaseRoom
}

// GET /api/rooms/{roomId}/rejoin - Fetch missed messages
// Similar to DB_MissedMessagesResponse but uses ApiMessage[] from API
export interface MissedMessagesResponse {
  type: 'missed_messages' | 'caught_up' | 'recent_messages'
  messages: ApiMessage[]
  count?: number
}

// POST /api/messages/send - Send a message
// Extend the canonical DB request with client-only optimisticId
export interface SendMessageRequest extends DB_SendMessageRequest {
  optimisticId?: string
}

export interface SendMessageResponse {
  success: boolean
  message: {
    id: string
    created_at?: string
  }
  error?: string
}

// POST /api/messages/unsend - Unsend/delete a message
// Use canonical DB type
export type UnsendMessageRequest = DB_UnsendMessageRequest

export interface UnsendMessageResponse {
  success: boolean
  message: {
    deletedAt: string
    deletedBy: string
  }
  error?: string
}

// POST /api/rooms/generate - Generate AI room suggestion
export interface GenerateRoomRequest {
  existingRoomNames: string[]
  currentName?: string
  currentDescription?: string
}

export interface GenerateRoomResponse {
  suggestion: {
    name: string
    description: string
  }
  error?: string
}

// POST /api/messages/mark-received - Mark a message as received
export interface MarkMessageAsReceivedRequest {
  userId: string
  roomId: string
  messageId: string
}

// POST /api/ai/stream - Stream AI response
export interface StreamAIMessageRequest {
  roomId: string
  userId: string
  message: string
  responseFormat?: 'plain' | 'markdown'
  previousMessages: Array<{
    content: string
    isAi: boolean
    userName: string
  }>
  isPrivate: boolean
  triggerMessageId?: string
}
