'use client'

import { useCallback, useOptimistic, startTransition } from 'react'
import type { ChatMessage } from '@/lib/types/database'
import { useMessageSender } from './use-message-sender'

interface UseOptimisticMessageSenderProps {
  roomId: string
  userId: string
  username: string
  userAvatarUrl?: string
  isConnected: boolean
  confirmedMessages: ChatMessage[]
  onConfirmedMessageUpdate: (
    updater: (messages: ChatMessage[]) => ChatMessage[]
  ) => void
}

interface UseOptimisticMessageSenderReturn {
  optimisticMessages: ChatMessage[]
  sendMessage: (content: string, isPrivate?: boolean) => Promise<string | null>
  retryMessage: (messageId: string) => Promise<boolean>
  queueStatus: {
    totalQueued: number
    pending: number
    failed: number
    isProcessing: boolean
  }
  clearFailedMessages: () => void
}

export function useOptimisticMessageSender({
  roomId,
  userId,
  username,
  userAvatarUrl,
  isConnected,
  confirmedMessages,
  onConfirmedMessageUpdate
}: UseOptimisticMessageSenderProps): UseOptimisticMessageSenderReturn {
  // Use React's useOptimistic for seamless optimistic updates
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    confirmedMessages,
    (currentMessages: ChatMessage[], newMessage: ChatMessage) => {
      // Check if message already exists to avoid duplicates
      const existingIndex = currentMessages.findIndex(
        (msg) => msg.id === newMessage.id
      )
      if (existingIndex >= 0) {
        return currentMessages.map((msg, index) =>
          index === existingIndex ? newMessage : msg
        )
      }
      return [...currentMessages, newMessage]
    }
  )

  // Get queue-based sender for offline scenarios
  const {
    sendMessage: sendMessageWithQueue,
    retryMessage,
    queueStatus,
    clearFailedMessages
  } = useMessageSender({
    roomId,
    userId,
    username,
    userAvatarUrl,
    isConnected,
    onMessageUpdate: onConfirmedMessageUpdate
  })

  // Create unified message sender function (online optimistic + offline queue)
  const sendMessage = useCallback(
    async (content: string, isPrivate = false): Promise<string | null> => {
      if (!content.trim()) return null

      // If offline, delegate to queue-based sender
      if (!isConnected) {
        return await sendMessageWithQueue(content, isPrivate)
      }

      // Online: use optimistic updates
      const optimisticMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: content.trim(),
        user: {
          id: userId,
          name: username,
          avatar_url: userAvatarUrl
        },
        createdAt: new Date().toISOString(),
        roomId: roomId,
        isAI: false,
        isPrivate,
        requesterId: isPrivate ? userId : undefined,
        isPending: false,
        isOptimistic: true,
        optimisticTimestamp: Date.now()
      }

      // Add optimistic message immediately within transition
      startTransition(() => {
        addOptimisticMessage(optimisticMessage)
      })

      try {
        // Send to server
        const response = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            roomId: roomId,
            userId,
            username,
            content: content.trim(),
            isPrivate
          })
        })

        const result = await response.json()

        if (!result.success) {
          // If failed, add failed message to confirmed messages
          const failedMessage = {
            ...optimisticMessage,
            isFailed: true,
            isOptimistic: false
          }
          onConfirmedMessageUpdate((current) => [...current, failedMessage])
        } else {
          // Success - for private messages only, add confirmed message
          // For public messages, let the broadcast handle it
          if (optimisticMessage.isPrivate) {
            const confirmedPrivateMessage = {
              ...optimisticMessage,
              id: result.message?.id || optimisticMessage.id,
              isOptimistic: false
            }
            onConfirmedMessageUpdate((current) => [
              ...current,
              confirmedPrivateMessage
            ])
          }
          // For public messages, do nothing - broadcast will arrive and deduplication will handle it
        }

        return result.success ? result.message?.id : null
      } catch (error) {
        console.error('Network error sending message:', error)
        // Add failed message to confirmed messages
        const failedMessage = {
          ...optimisticMessage,
          isFailed: true,
          isOptimistic: false
        }
        onConfirmedMessageUpdate((current) => [...current, failedMessage])
        return null
      }
    },
    [
      roomId,
      userId,
      username,
      userAvatarUrl,
      isConnected,
      addOptimisticMessage,
      sendMessageWithQueue,
      onConfirmedMessageUpdate
    ]
  )

  return {
    optimisticMessages,
    sendMessage,
    retryMessage,
    queueStatus,
    clearFailedMessages
  }
}
