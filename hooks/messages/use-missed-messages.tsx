'use client'

import type { ChatMessage } from '@/lib/types/database'
import { useMissedMessages as useMissedMessagesQuery } from '@/lib/query/queries/use-missed-messages'

interface UseMissedMessagesProps {
  roomId: string
  userId: string
  enabled: boolean
}

interface UseMissedMessagesReturn {
  messages: ChatMessage[]
  loading: boolean
  error: string | null
}

export function useMissedMessages({
  roomId,
  userId,
  enabled = true
}: UseMissedMessagesProps): UseMissedMessagesReturn {
  const {
    data: messages = [],
    isLoading: loading,
    error: queryError
  } = useMissedMessagesQuery({
    roomId,
    userId,
    enabled
  })

  return {
    messages,
    loading,
    error: queryError ? 'Failed to fetch missed messages' : null
  }
}
