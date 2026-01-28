'use client'

import { useState, useCallback, useMemo } from 'react'
import ky from 'ky'
import type { ChatMessage } from '@/lib/types/database'
import type { PresenceState } from '@/lib/types/presence'
import { useNetworkConnectivity, useWebSocketConnection } from '../connection'
import { useMissedMessages, useOptimisticMessageSender } from '../messages'

interface UseRealtimeChatProps {
  roomId: string
  username: string
  userId: string
  userAvatarUrl?: string
}

export function useRealtimeChat({
  roomId,
  username,
  userId,
  userAvatarUrl
}: UseRealtimeChatProps) {
  const [confirmedMessages, setConfirmedMessages] = useState<ChatMessage[]>([])
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(
    new Set()
  )
  const [presenceUsers, setPresenceUsers] = useState<PresenceState>({})

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
    (receivedMessage: ChatMessage): void => {
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
      ky.post('/api/messages/mark-received', {
        json: {
          userId,
          roomId: roomId,
          messageId: receivedMessage.id
        }
      }).catch((error) =>
        console.error('Error marking message as received:', error)
      )
    },
    [roomId, userId]
  )

  // Handle unsent message events
  const handleMessageUnsent = useCallback((messageId: string): void => {
    // Track deleted message IDs globally
    setDeletedMessageIds((prev) => new Set(prev).add(messageId))

    // Update confirmed messages
    setConfirmedMessages((current) =>
      current.map((msg) =>
        msg.id === messageId ? { ...msg, isDeleted: true } : msg
      )
    )
  }, [])

  // Handle presence sync events
  const handlePresenceSync = useCallback((state: PresenceState) => {
    setPresenceUsers(state)
  }, [])

  // WebSocket connection for real-time messaging
  useWebSocketConnection({
    roomId,
    userId,
    onMessage: handleIncomingMessage,
    onMessageUnsent: handleMessageUnsent,
    enabled: true,
    username,
    userAvatarUrl,
    onPresenceSync: handlePresenceSync
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
    userAvatarUrl,
    isConnected,
    confirmedMessages,
    onConfirmedMessageUpdate: setConfirmedMessages
  })

  // Merge missed messages with optimistic messages
  const allMessages = useMemo(() => {
    // Mark missed messages as deleted if they're in the deleted set
    const updatedMissedMessages = missedMessages.map((msg) =>
      deletedMessageIds.has(msg.id) ? { ...msg, isDeleted: true } : msg
    )

    const combinedMessages = [...updatedMissedMessages, ...optimisticMessages]
    const messageMap = new Map<string, ChatMessage>()

    // Deduplication by message ID and clientMsgId
    combinedMessages.forEach((message) => {
      const existingMessage = messageMap.get(message.id)

      if (!existingMessage) {
        // Check if this is a broadcast replacing an optimistic message
        // Use clientMsgId for deterministic reconciliation
        if (!message.isOptimistic && message.clientMsgId) {
          // Look for the optimistic message with matching ID (which was the optimisticId)
          const optimisticMessage = messageMap.get(message.clientMsgId)

          if (optimisticMessage?.isOptimistic) {
            // Deterministic match found - replace optimistic with confirmed
            messageMap.delete(message.clientMsgId)
            messageMap.set(message.id, {
              ...message,
              isOptimistic: false,
              isOptimisticConfirmed: false
            })
          } else {
            // No matching optimistic message found
            messageMap.set(message.id, message)
          }
        } else {
          // No clientMsgId or this is an optimistic message
          messageMap.set(message.id, message)
        }
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
  }, [missedMessages, optimisticMessages, deletedMessageIds])

  // Callback to update confirmed messages and track deleted messages
  const handleMessageUpdate = useCallback(
    (updater: (messages: ChatMessage[]) => ChatMessage[]) => {
      setConfirmedMessages((current) => {
        const updated = updater(current)

        // Check if any messages were marked as deleted and add them to deletedMessageIds
        updated.forEach((msg) => {
          if (msg.isDeleted) {
            setDeletedMessageIds((prev) => new Set(prev).add(msg.id))
          }
        })

        return updated
      })
    },
    []
  )

  // Direct method to mark a message as deleted (for unsend)
  const markMessageAsDeleted = useCallback((messageId: string) => {
    setDeletedMessageIds((prev) => new Set(prev).add(messageId))
    // Also update confirmed messages if the message exists there
    setConfirmedMessages((current) =>
      current.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              isDeleted: true,
              content: 'This message was deleted'
            }
          : msg
      )
    )
  }, [])

  return {
    messages: allMessages,
    sendMessage,
    retryMessage,
    isConnected,
    loading: missedMessagesLoading,
    queueStatus,
    clearFailedMessages,
    onMessageUpdate: handleMessageUpdate,
    markMessageAsDeleted,
    deletedMessageIds,
    presenceUsers
  }
}
