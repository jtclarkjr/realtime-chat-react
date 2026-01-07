'use client'

import { useCallback, useState } from 'react'
import { useUnsendMessageMutation } from '@/lib/query/mutations/use-unsend-message'

interface UseUnsendMessageProps {
  userId: string
  roomId: string
  markMessageAsDeleted: (messageId: string) => void
}

interface UseUnsendMessageReturn {
  unsendMessage: (messageId: string) => Promise<boolean>
  isUnsending: (messageId: string) => boolean
}

export function useUnsendMessage({
  userId,
  roomId,
  markMessageAsDeleted
}: UseUnsendMessageProps): UseUnsendMessageReturn {
  const [unsendingMessages, setUnsendingMessages] = useState<Set<string>>(
    new Set()
  )
  const unsendMessageMutation = useUnsendMessageMutation()

  const unsendMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (unsendingMessages.has(messageId)) {
        return false // Already unsending this message
      }

      setUnsendingMessages((prev) => new Set(prev).add(messageId))

      try {
        const result = await unsendMessageMutation.mutateAsync({
          messageId,
          userId,
          roomId
        })

        if (result.success) {
          // Mark message as deleted - this handles both confirmed and missed messages
          markMessageAsDeleted(messageId)
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
    [
      userId,
      roomId,
      markMessageAsDeleted,
      unsendingMessages,
      unsendMessageMutation
    ]
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
