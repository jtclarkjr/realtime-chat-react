import { useEffect, useCallback, useState } from 'react'
import type { ChatMessage } from '@/lib/types/database'

interface UseLastReadMessageProps {
  roomId: string
  messages: ChatMessage[]
}

interface LastReadMessageData {
  messageId: string
  timestamp: string
  sessionId: string
}

export const useLastReadMessage = ({
  roomId,
  messages
}: UseLastReadMessageProps) => {
  const [currentSessionId] = useState(() => `session_${Date.now()}_${Math.random()}`)

  const getStorageKey = (room: string) => `lastReadMessage_${room}`

  const getLastReadMessage = useCallback((): LastReadMessageData | null => {
    try {
      const stored = localStorage.getItem(getStorageKey(roomId))
      if (!stored) return null
      return JSON.parse(stored) as LastReadMessageData
    } catch {
      return null
    }
  }, [roomId])

  const updateLastReadMessage = useCallback(
    (messageId: string, timestamp: string) => {
      try {
        const data: LastReadMessageData = {
          messageId,
          timestamp,
          sessionId: currentSessionId
        }
        localStorage.setItem(getStorageKey(roomId), JSON.stringify(data))
      } catch (error) {
        console.error('Failed to save last read message:', error)
      }
    },
    [roomId, currentSessionId]
  )

  const markAsRead = useCallback(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage) {
      updateLastReadMessage(lastMessage.id, lastMessage.createdAt)
    }
  }, [messages, updateLastReadMessage])

  // Save last read message when leaving the room (component unmount)
  useEffect(() => {
    return () => {
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1]
        updateLastReadMessage(lastMessage.id, lastMessage.createdAt)
      }
    }
  }, [messages, updateLastReadMessage])

  return {
    getLastReadMessage,
    updateLastReadMessage,
    markAsRead,
    currentSessionId
  }
}
