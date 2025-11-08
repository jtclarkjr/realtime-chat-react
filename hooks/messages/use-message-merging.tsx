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
    const mergedMessages = [...initialMessages, ...realtimeMessages]

    // Handle streaming messages and potential duplicates
    streamingMessages.forEach((streamingMessage) => {
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
    })

    // Remove duplicates based on message id and filter out invalid messages
    const uniqueMessages = mergedMessages.filter((message, index, self) => {
      if (!message) return false
      if (!message.id) return false
      
      // Filter out deleted messages (check both isDeleted flag and deletedMessageIds set)
      if (message.isDeleted || deletedMessageIds.has(message.id)) {
        return false
      }
      
      // Filter out messages without content or invalid structure
      const isStreamingMessage = streamingMessages.some((sm) => sm === message)
      if (
        !message ||
        !message.id ||
        (!message.content?.trim() && !isStreamingMessage) || // Allow empty content for streaming messages
        !message.user?.name
      ) {
        return false
      }

      // Filter out private messages that don't belong to current user
      // Private messages should only be visible to the user who requested them OR the user who sent them
      if (
        message.isPrivate &&
        message.requesterId !== userId &&
        message.user?.id !== userId
      ) {
        return false
      }

      // For messages with the same ID, prefer non-streaming (broadcast) messages
      const duplicateIndex = self.findIndex((m) => m?.id === message.id)
      if (duplicateIndex !== index) {
        // This is a duplicate - prefer broadcast messages over streaming
        const firstOccurrence = self[duplicateIndex]
        const currentIsStreaming =
          message.isStreaming || streamingMessages.some((sm) => sm === message)
        const firstIsStreaming =
          firstOccurrence?.isStreaming ||
          streamingMessages.some((sm) => sm === firstOccurrence)

        if (currentIsStreaming && !firstIsStreaming) {
          return false // Remove streaming message in favor of broadcast
        }
        if (firstIsStreaming && !currentIsStreaming) {
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
  }, [initialMessages, realtimeMessages, streamingMessages, userId, deletedMessageIds])

  return allMessages
}
