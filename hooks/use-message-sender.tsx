'use client'

import { useCallback } from 'react'
import type { ChatMessage } from '@/lib/types/database'
import { useMessageQueue } from './use-message-queue'

interface UseMessageSenderProps {
  roomId: string
  userId: string
  username: string
  isConnected: boolean
  onMessageUpdate: (updater: (messages: ChatMessage[]) => ChatMessage[]) => void
}

interface UseMessageSenderReturn {
  sendMessage: (
    content: string,
    isPrivate?: boolean,
    messageId?: string
  ) => Promise<string | null>
  retryMessage: (messageId: string) => Promise<boolean>
  queueStatus: {
    totalQueued: number
    pending: number
    failed: number
    isProcessing: boolean
  }
  clearFailedMessages: () => void
}

export function useMessageSender({
  roomId,
  userId,
  username,
  isConnected,
  onMessageUpdate
}: UseMessageSenderProps): UseMessageSenderReturn {
  // Process queued messages when connection is restored
  const processQueuedMessage = useCallback(
    async (
      queuedMessage: ChatMessage & {
        originalContent: string
        isPrivate: boolean
      }
    ): Promise<boolean> => {
      try {
        const response = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            roomId: roomId,
            userId,
            username,
            content: queuedMessage.originalContent,
            isPrivate: queuedMessage.isPrivate
          })
        })

        const result = await response.json()

        if (result.success) {
          // Remove queued message (broadcast will add final version)
          onMessageUpdate((current) =>
            current.filter((msg) => msg.id !== queuedMessage.id)
          )
        }

        return result.success
      } catch (error) {
        console.error('Error processing queued message:', error)
        return false
      }
    },
    [roomId, userId, username, onMessageUpdate]
  )

  // Message queue for offline scenarios
  const messageQueue = useMessageQueue({
    roomId,
    userId,
    isConnected,
    onProcessMessage: processQueuedMessage
  })

  // Send message when online (direct to server)
  const sendOnlineMessage = useCallback(
    async (content: string, isPrivate = false, messageId?: string) => {
      const optimisticId = messageId || crypto.randomUUID()
      const message: ChatMessage = {
        id: optimisticId,
        content: content.trim(),
        user: {
          id: userId,
          name: username
        },
        createdAt: new Date().toISOString(),
        roomId: roomId,
        isAI: false,
        isPrivate,
        requesterId: isPrivate ? userId : undefined,
        isPending: true
      }

      // Show message immediately with optimistic metadata
      const optimisticMessage = {
        ...message,
        isPending: false,
        isQueued: false,
        isRetrying: false,
        isFailed: false,
        // Add metadata to help with deduplication
        isOptimistic: true,
        optimisticTimestamp: Date.now()
      }

      onMessageUpdate((current) => {
        if (messageId) {
          return current.map((msg) =>
            msg.id === messageId ? optimisticMessage : msg
          )
        }
        return [...current, optimisticMessage]
      })

      try {
        const response = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            roomId: roomId,
            userId,
            username,
            content: content.trim(),
            isPrivate,
            optimisticId // Send optimistic ID to server for correlation
          })
        })

        const result = await response.json()

        if (result.success) {
          // Instead of updating the message ID, mark it as confirmed
          // The broadcast message will replace this optimistic one
          onMessageUpdate((current) =>
            current.map((msg) =>
              (msg.id === optimisticId || msg.id === messageId) &&
              msg.isOptimistic
                ? {
                    ...msg,
                    isOptimisticConfirmed: true,
                    serverId: result.message.id,
                    serverTimestamp:
                      result.message.created_at || new Date().toISOString()
                  }
                : msg
            )
          )
          return result.message.id
        } else {
          // Show failed message on error
          const failedMessage = {
            ...message,
            isPending: false,
            isFailed: true,
            isOptimistic: false
          }
          onMessageUpdate((current) => {
            if (messageId) {
              return current.map((msg) =>
                msg.id === messageId ? failedMessage : msg
              )
            }
            return [...current, failedMessage]
          })
          return null
        }
      } catch (error) {
        console.error('Network error sending message:', error)
        const failedMessage = {
          ...message,
          isPending: false,
          isFailed: true,
          isOptimistic: false
        }
        onMessageUpdate((current) => {
          if (messageId) {
            return current.map((msg) =>
              msg.id === messageId ? failedMessage : msg
            )
          }
          return [...current, failedMessage]
        })
        return null
      }
    },
    [roomId, userId, username, onMessageUpdate]
  )

  // Queue message when offline
  const sendOfflineMessage = useCallback(
    async (content: string, isPrivate = false, messageId?: string) => {
      const message: ChatMessage = {
        id: messageId || crypto.randomUUID(),
        content: content.trim(),
        user: {
          id: userId,
          name: username
        },
        createdAt: new Date().toISOString(),
        roomId: roomId,
        isAI: false,
        isPrivate,
        requesterId: isPrivate ? userId : undefined,
        isPending: false
      }

      const queuedMessage = messageQueue.queueMessage(
        message,
        content.trim(),
        isPrivate
      )
      onMessageUpdate((current) => [...current, queuedMessage])
      return message.id
    },
    [messageQueue, onMessageUpdate, roomId, userId, username]
  )

  // Route to appropriate sending method based on connectivity
  const sendMessage = useCallback(
    async (content: string, isPrivate = false, messageId?: string) => {
      if (!content.trim()) return null

      return isConnected
        ? sendOnlineMessage(content, isPrivate, messageId)
        : sendOfflineMessage(content, isPrivate, messageId)
    },
    [isConnected, sendOnlineMessage, sendOfflineMessage]
  )

  const retryMessage = useCallback(
    async (messageId: string) => {
      return await messageQueue.retryMessage(messageId)
    },
    [messageQueue]
  )

  return {
    sendMessage,
    retryMessage,
    queueStatus: isConnected
      ? { totalQueued: 0, pending: 0, failed: 0, isProcessing: false }
      : messageQueue.getQueueStatus(),
    clearFailedMessages: messageQueue.clearFailedMessages
  }
}
