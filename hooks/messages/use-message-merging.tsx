'use client'

import { useMemo } from 'react'
import type { ChatMessage } from '@/lib/types/database'

interface UseMessageMergingProps {
  initialMessages: ChatMessage[]
  realtimeMessages: ChatMessage[]
  streamingMessages: ChatMessage[]
  userId: string
  deletedMessageIds?: Set<string>
}

export function useMessageMerging({
  initialMessages,
  realtimeMessages,
  streamingMessages,
  userId,
  deletedMessageIds = new Set()
}: UseMessageMergingProps) {
  const allMessages = useMemo(() => {
    const messageById = new Map<string, ChatMessage>()
    const streamingMessageIds = new Set(
      streamingMessages.map((message) => message.id)
    )
    const fallbackTime = Date.now()

    const isStreamingMessage = (message: ChatMessage) =>
      message.isStreaming || streamingMessageIds.has(message.id)

    const shouldIncludeMessage = (message: ChatMessage) => {
      if (!message?.id) return false
      if (message.isDeleted || deletedMessageIds.has(message.id)) return false
      if (!message.user?.name) return false

      const isStreaming = isStreamingMessage(message)
      if (!message.content?.trim() && !isStreaming) return false

      if (
        message.isPrivate &&
        message.requesterId !== userId &&
        message.user?.id !== userId
      ) {
        return false
      }

      return true
    }

    const upsertMessage = (message: ChatMessage) => {
      if (!shouldIncludeMessage(message)) return

      const existing = messageById.get(message.id)
      if (!existing) {
        messageById.set(message.id, message)
        return
      }

      const existingIsStreaming = isStreamingMessage(existing)
      const currentIsStreaming = isStreamingMessage(message)
      if (existingIsStreaming && !currentIsStreaming) {
        messageById.set(message.id, message)
      }
    }

    initialMessages.forEach(upsertMessage)
    realtimeMessages.forEach(upsertMessage)
    streamingMessages.forEach(upsertMessage)

    const uniqueMessages = Array.from(messageById.values())

    // Sort by creation date with null checks
    const sortedMessages = uniqueMessages.sort((a, b) => {
      const timeA = a.createdAt ? Date.parse(a.createdAt) : fallbackTime
      const timeB = b.createdAt ? Date.parse(b.createdAt) : fallbackTime
      return timeA - timeB
    })

    return sortedMessages
  }, [
    initialMessages,
    realtimeMessages,
    streamingMessages,
    userId,
    deletedMessageIds
  ])

  return allMessages
}
