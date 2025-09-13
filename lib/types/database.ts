import { Database } from './supabase'

// Supabase table row types
export type DatabaseMessage = Database['public']['Tables']['messages']['Row']
export type DatabaseMessageInsert =
  Database['public']['Tables']['messages']['Insert']
export type DatabaseMessageUpdate =
  Database['public']['Tables']['messages']['Update']

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
}

export interface MarkReceivedRequest {
  userId: string
  roomId: string
  messageId: string
}
