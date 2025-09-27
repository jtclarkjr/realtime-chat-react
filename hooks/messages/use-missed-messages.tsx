'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ApiMessage, ChatMessage } from '@/lib/types/database'

interface TransformedMessage {
  id: string
  content: string
  user: {
    id: string
    name: string
  }
  createdAt: string
  roomId: string
}

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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMissedMessages = useCallback(async (): Promise<
    void | (() => void)
  > => {
    if (!enabled) {
      setLoading(false)
      return
    }

    let isCancelled = false
    setLoading(true)
    setError(null)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(
        `/api/rooms/${roomId}/rejoin?userId=${userId}`,
        {
          signal: controller.signal,
          credentials: 'same-origin'
        }
      )

      clearTimeout(timeoutId)

      if (isCancelled) return

      if (response.ok) {
        const data = await response.json()

        if (isCancelled) return

        if (
          (data.type === 'missed_messages' ||
            data.type === 'recent_messages') &&
          data.messages?.length > 0
        ) {
          // Transform and clean database messages
          const transformedMessages: TransformedMessage[] = data.messages.map(
            (msg: ApiMessage) => ({
              id: msg.id,
              content: msg.content,
              user: {
                id: msg.user.id,
                name: msg.user.name
              },
              createdAt: msg.createdAt,
              roomId: msg.channelId,
              // Clean states (DB messages are confirmed sent)
              isPending: false,
              isQueued: false,
              isRetrying: false,
              isFailed: false
            })
          )

          setMessages(transformedMessages)
        }
      } else {
        const errorMsg = `Failed to fetch missed messages: ${response.statusText}`
        console.error(errorMsg)
        setError(errorMsg)
      }
    } catch (err) {
      if (!isCancelled) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.warn(
            'Missed messages fetch timed out, continuing with real-time only'
          )
          setError('Request timed out')
        } else {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error'
          console.error('Error fetching missed messages:', err)
          setError(errorMsg)
        }
      }
    } finally {
      if (!isCancelled) {
        setLoading(false)
      }
    }

    return () => {
      isCancelled = true
    }
  }, [roomId, userId, enabled])

  useEffect(() => {
    fetchMissedMessages()
  }, [fetchMissedMessages])

  return {
    messages,
    loading,
    error
  }
}
