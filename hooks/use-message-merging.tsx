'use client'

import { useMemo } from 'react'
import type { ChatMessage } from '@/lib/types/database'

interface UseMessageMergingProps {
  initialMessages: ChatMessage[]
  realtimeMessages: ChatMessage[]
  streamingMessage: ChatMessage | null
  userId: string
}

export function useMessageMerging({
  initialMessages,
  realtimeMessages,
  streamingMessage,
  userId
}: UseMessageMergingProps) {
  const allMessages = useMemo(() => {
    const mergedMessages = [...initialMessages, ...realtimeMessages]

    // Handle streaming message and potential duplicates
    if (streamingMessage) {
      // Check if there's already a broadcast message with the same ID
      const existingBroadcastMessage = mergedMessages.find(
        (msg) => msg.id === streamingMessage.id && msg !== streamingMessage
      )

      if (existingBroadcastMessage && !streamingMessage.isPrivate) {
        // Public message: broadcast exists, don't add streaming message
        // The broadcast message is already in mergedMessages
      } else {
        // Either no broadcast yet, or this is a private message (which won't have broadcasts)
        mergedMessages.push(streamingMessage)
      }
    }

    // Remove duplicates based on message id and filter out invalid messages
    const uniqueMessages = mergedMessages.filter((message, index, self) => {
      // Filter out messages without content or invalid structure
      if (
        !message ||
        !message.id ||
        (!message.content?.trim() && message !== streamingMessage) || // Allow empty content for streaming messages
        !message.user?.name
      ) {
        return false
      }

      // Filter out private messages that don't belong to current user
      // Private messages should only be visible to the user who requested them
      if (message.isPrivate && message.requesterId !== userId) {
        return false
      }

      // For messages with the same ID, prefer non-streaming (broadcast) messages
      const duplicateIndex = self.findIndex((m) => m?.id === message.id)
      if (duplicateIndex !== index) {
        // This is a duplicate - prefer broadcast messages over streaming
        const firstOccurrence = self[duplicateIndex]
        const isStreamingMessage =
          message.isStreaming || message === streamingMessage
        const isFirstStreaming =
          firstOccurrence?.isStreaming || firstOccurrence === streamingMessage

        if (isStreamingMessage && !isFirstStreaming) {
          return false // Remove streaming message in favor of broadcast
        }
        if (isFirstStreaming && !isStreamingMessage) {
          return true // Keep broadcast message over streaming
        }
      }

      return duplicateIndex === index // Keep first occurrence for non-conflicting cases
    })

    // Sort by creation date with null checks
    const sortedMessages = uniqueMessages.sort((a, b) => {
      const dateA = a.createdAt || new Date().toISOString()
      const dateB = b.createdAt || new Date().toISOString()
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    })

    return sortedMessages
  }, [initialMessages, realtimeMessages, streamingMessage, userId])

  return allMessages
}