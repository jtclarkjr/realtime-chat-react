'use client'

import { useCallback } from 'react'
import type { ChatMessage } from '@/lib/types/database'
import { useMessageSender } from './use-message-sender'
import { useSendMessage } from '@/lib/query/mutations/use-send-message'

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
  // React Query mutation for sending messages
  const sendMessageMutation = useSendMessage()

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

  // Create unified message sender function
  const sendMessage = useCallback(
    async (content: string, isPrivate = false): Promise<string | null> => {
      if (!content.trim()) return null

      // If offline, delegate to queue-based sender
      if (!isConnected) {
        return await sendMessageWithQueue(content, isPrivate)
      }

      try {
        // Send to server using React Query mutation
        const result = await sendMessageMutation.mutateAsync({
          roomId: roomId,
          userId,
          username,
          content: content.trim(),
          isPrivate
        })

        if (!result.success) {
          // If failed, show failed message with server's message ID (or generate one)
          const failedMessage: ChatMessage = {
            id: result.message?.id || crypto.randomUUID(),
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
            isFailed: true,
            isOptimistic: false
          }
          onConfirmedMessageUpdate((current) => [...current, failedMessage])
        } else if (isPrivate && result.message) {
          // For private messages, add to local state since they won't be broadcast
          const successMessage: ChatMessage = {
            id: result.message.id,
            content: content.trim(),
            user: {
              id: userId,
              name: username,
              avatar_url: userAvatarUrl
            },
            createdAt: result.message.created_at || new Date().toISOString(),
            roomId: roomId,
            isAI: false,
            isPrivate: true,
            requesterId: userId,
            isPending: false,
            isFailed: false,
            isOptimistic: false
          }
          onConfirmedMessageUpdate((current) => [...current, successMessage])
        }

        return result.success ? result.message?.id : null
      } catch (error) {
        console.error('Network error sending message:', error)
        // Show failed message on network error (generate temp ID since we don't have server ID)
        const failedMessage: ChatMessage = {
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
      sendMessageWithQueue,
      onConfirmedMessageUpdate,
      sendMessageMutation
    ]
  )

  return {
    optimisticMessages: confirmedMessages,
    sendMessage,
    retryMessage,
    queueStatus,
    clearFailedMessages
  }
}
