'use client'

import { useCallback, useState } from 'react'
import type { ChatMessage } from '@/lib/types/database'

interface UseUnsendMessageProps {
  userId: string
  roomId: string
  onMessageUpdate: (updater: (messages: ChatMessage[]) => ChatMessage[]) => void
}

interface UseUnsendMessageReturn {
  unsendMessage: (messageId: string) => Promise<boolean>
  isUnsending: (messageId: string) => boolean
}

export function useUnsendMessage({
  userId,
  roomId,
  onMessageUpdate
}: UseUnsendMessageProps): UseUnsendMessageReturn {
  const [unsendingMessages, setUnsendingMessages] = useState<Set<string>>(
    new Set()
  )

  const unsendMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (unsendingMessages.has(messageId)) {
        return false // Already unsending this message
      }

      setUnsendingMessages((prev) => new Set(prev).add(messageId))

      try {
        const response = await fetch('/api/messages/unsend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            messageId,
            userId,
            roomId
          })
        })

        const result = await response.json()

        if (result.success) {
          // Update the message in the local state to show it as deleted
          onMessageUpdate((current) =>
            current.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    isDeleted: true,
                    deletedAt: result.message.deletedAt,
                    deletedBy: result.message.deletedBy,
                    content: 'This message was deleted'
                  }
                : msg
            )
          )
          return true
        } else {
          console.error('Failed to unsend message:', result.error)
          return false
        }
      } catch (error) {
        console.error('Error unsending message:', error)
        return false
      } finally {
        setUnsendingMessages((prev) => {
          const newSet = new Set(prev)
          newSet.delete(messageId)
          return newSet
        })
      }
    },
    [userId, roomId, onMessageUpdate, unsendingMessages]
  )

  const isUnsending = useCallback(
    (messageId: string): boolean => {
      return unsendingMessages.has(messageId)
    },
    [unsendingMessages]
  )

  return {
    unsendMessage,
    isUnsending
  }
}
