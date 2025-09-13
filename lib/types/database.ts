export interface DatabaseMessage {
  id: number
  channel_id: number
  user_id: string
  message: string | null
  inserted_at: string
}

export interface ChatMessageWithDB {
  id: string
  content: string
  user: {
    id: string
    name: string
  }
  createdAt: string
  channelId: number
}

export interface MissedMessagesResponse {
  type: 'missed_messages' | 'caught_up' | 'recent_messages'
  messages: ChatMessageWithDB[]
  count: number
}

export interface SendMessageRequest {
  roomId: string
  userId: string
  username: string
  content: string
}

export interface MarkReceivedRequest {
  userId: string
  channelId: number
  messageId: number
}
