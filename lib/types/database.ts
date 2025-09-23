import { Database } from './supabase'

// Supabase table row types
export type DatabaseMessage = Database['public']['Tables']['messages']['Row']
export type DatabaseMessageInsert =
  Database['public']['Tables']['messages']['Insert']
export type DatabaseMessageUpdate =
  Database['public']['Tables']['messages']['Update']

export type DatabaseRoom = Database['public']['Tables']['rooms']['Row']
export type DatabaseRoomInsert = Database['public']['Tables']['rooms']['Insert']
export type DatabaseRoomUpdate = Database['public']['Tables']['rooms']['Update']

// API message types from external source
export interface ApiMessage {
  id: string
  content: string
  user: {
    id: string
    name: string
  }
  createdAt: string
  channelId: string
}

// Application layer message types
export interface ChatMessageWithDB {
  id: string
  content: string
  user: {
    id: string
    name: string
  }
  createdAt: string
  channelId: string
  isAI?: boolean
  isPrivate?: boolean
  requesterId?: string
}

// Chat message interface used in components and hooks
export interface ChatMessage {
  id: string
  content: string
  user: {
    id?: string
    name: string
  }
  createdAt: string
  roomId?: string
  isAI?: boolean
  isStreaming?: boolean
  isPrivate?: boolean
  requesterId?: string // ID of user who requested the AI response (for private messages)
  isFailed?: boolean
  isRetrying?: boolean
  isQueued?: boolean
  isPending?: boolean
  retryAttempts?: number
}

// Response types
export interface MissedMessagesResponse {
  type: 'missed_messages' | 'caught_up' | 'recent_messages'
  messages: ChatMessageWithDB[]
  count: number
}

// Request types
export interface SendMessageRequest {
  roomId: string
  userId: string
  username: string
  content: string
  isPrivate?: boolean
}

export interface SendAIMessageRequest {
  roomId: string
  content: string
  isPrivate?: boolean
  requesterId?: string
}

export interface MarkReceivedRequest {
  userId: string
  roomId: string
  messageId: string
}
