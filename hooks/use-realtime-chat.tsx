'use client'

import { useState, useCallback, useMemo } from 'react'
import type { ChatMessage } from '@/lib/types/database'
import { useNetworkConnectivity } from './use-network-connectivity'
import { useMissedMessages } from './use-missed-messages'
import { useWebSocketConnection } from './use-websocket-connection'
import { useOptimisticMessageSender } from './use-optimistic-message-sender'

interface UseRealtimeChatProps {
  roomId: string
  username: string
  userId: string
}

export function useRealtimeChat({
  roomId,
  username,
  userId
}: UseRealtimeChatProps) {
  const [confirmedMessages, setConfirmedMessages] = useState<ChatMessage[]>([])

  // Network connectivity detection
  const networkState = useNetworkConnectivity()
  const isConnected = networkState.isOnline

  // Fetch missed messages on mount
  const { messages: missedMessages, loading: missedMessagesLoading } =
    useMissedMessages({
      roomId,
      userId,
      enabled: true
    })

  // Handle incoming real-time messages (broadcast messages)
  const handleIncomingMessage = useCallback(
    (receivedMessage: ChatMessage) => {
      // Clean message states (broadcast = confirmed sent)
      const cleanedMessage = {
        ...receivedMessage,
        isPending: false,
        isQueued: false,
        isRetrying: false,
        isFailed: false,
        isOptimistic: false
      }

      // Add to confirmed messages - useOptimistic will handle deduplication automatically
      setConfirmedMessages((current) => {
        // Check if message already exists to avoid duplicates
        const existingIndex = current.findIndex(
          (msg) => msg.id === receivedMessage.id
        )
        if (existingIndex >= 0) {
          // Update existing message
          return current.map((msg, index) =>
            index === existingIndex ? cleanedMessage : msg
          )
        }
        return [...current, cleanedMessage]
      })

      // Mark message as received (async, don't wait)
      fetch('/api/messages/mark-received', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          userId,
          roomId: roomId,
          messageId: receivedMessage.id
        })
      }).catch((error) =>
        console.error('Error marking message as received:', error)
      )
    },
    [roomId, userId]
  )

  // WebSocket connection for real-time messaging
  useWebSocketConnection({
    roomId,
    userId,
    onMessage: handleIncomingMessage,
    enabled: true
  })

  // Optimistic message sender with queue support
  const {
    optimisticMessages,
    sendMessage,
    retryMessage,
    queueStatus,
    clearFailedMessages
  } = useOptimisticMessageSender({
    roomId,
    userId,
    username,
    isConnected,
    confirmedMessages,
    onConfirmedMessageUpdate: setConfirmedMessages
  })

  // Merge missed messages with optimistic messages
  const allMessages = useMemo(() => {
    const combinedMessages = [...missedMessages, ...optimisticMessages]
    const messageMap = new Map<string, ChatMessage>()

    // Simple deduplication by message ID
    combinedMessages.forEach((message) => {
      const existingMessage = messageMap.get(message.id)

      if (!existingMessage) {
        messageMap.set(message.id, message)
      } else {
        // Always prefer confirmed messages over optimistic ones
        if (!message.isOptimistic && existingMessage.isOptimistic) {
          messageMap.set(message.id, message)
        } else if (message.isOptimistic && !existingMessage.isOptimistic) {
          // Keep the confirmed message
        } else {
          // Both same type, prefer newer timestamp
          const newTime = new Date(message.createdAt || 0).getTime()
          const existingTime = new Date(
            existingMessage.createdAt || 0
          ).getTime()
          if (newTime > existingTime) {
            messageMap.set(message.id, message)
          }
        }
      }
    })

    // Convert back to array and sort by creation date
    const uniqueMessages = Array.from(messageMap.values())
    return uniqueMessages.sort(
      (a, b) =>
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime()
    )
  }, [missedMessages, optimisticMessages])

  return {
    messages: allMessages,
    sendMessage,
    retryMessage,
    isConnected,
    loading: missedMessagesLoading,
    queueStatus,
    clearFailedMessages
  }
}
