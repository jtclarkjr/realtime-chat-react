'use client'

import { useCallback } from 'react'
import type { ChatMessage } from '@/lib/types/database'
import { useMessageSender } from './use-message-sender'
import { useSendMessage } from '@/lib/query/mutations/use-send-message'

const MAX_RETRY_ATTEMPTS = 2
const RETRY_DELAY_MS = 1000

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
    retryMessage: retryMessageWithQueue,
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

  const updateMessageById = useCallback(
    (
      messageId: string,
      updater: (message: ChatMessage) => ChatMessage
    ): void => {
      onConfirmedMessageUpdate((current) =>
        current.map((message) =>
          message.id === messageId ? updater(message) : message
        )
      )
    },
    [onConfirmedMessageUpdate]
  )

  const applySuccess = useCallback(
    (
      optimisticId: string,
      result: { message: { id: string; created_at?: string } },
      isPrivate: boolean
    ) => {
      if (isPrivate) {
        onConfirmedMessageUpdate((current) =>
          current.map((msg) =>
            msg.id === optimisticId
              ? {
                  ...msg,
                  id: result.message.id,
                  createdAt:
                    result.message.created_at || new Date().toISOString(),
                  isOptimistic: false,
                  isOptimisticConfirmed: false,
                  isFailed: false,
                  isRetrying: false,
                  isPending: false
                }
              : msg
          )
        )
        return
      }

      updateMessageById(optimisticId, (message) => ({
        ...message,
        isOptimisticConfirmed: true,
        serverId: result.message.id,
        serverTimestamp:
          result.message.created_at || new Date().toISOString(),
        isFailed: false,
        isRetrying: false,
        isPending: false
      }))
    },
    [onConfirmedMessageUpdate, updateMessageById]
  )

  const applyFailure = useCallback(
    (optimisticId: string, attemptsMade: number) => {
      updateMessageById(optimisticId, (message) => ({
        ...message,
        isFailed: true,
        isRetrying: false,
        isPending: false,
        isQueued: false,
        isOptimistic: false,
        retryAttempts: attemptsMade
      }))
    },
    [updateMessageById]
  )

  const sendWithRetries = useCallback(
    async ({
      optimisticId,
      content,
      isPrivate
    }: {
      optimisticId: string
      content: string
      isPrivate: boolean
    }): Promise<{
      result: {
        success: boolean
        message: { id: string; created_at?: string }
      } | null
      attemptsMade: number
    }> => {
      let lastResult: {
        success: boolean
        message: { id: string; created_at?: string }
      } | null = null
      let attemptsMade = 0

      for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
        if (attempt > 0) {
          updateMessageById(optimisticId, (message) => ({
            ...message,
            isRetrying: true,
            isPending: true,
            isFailed: false,
            isOptimistic: true,
            optimisticTimestamp: Date.now(),
            retryAttempts: attempt
          }))
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
        }

        attemptsMade = attempt + 1

        try {
          lastResult = await sendMessageMutation.mutateAsync({
            roomId: roomId,
            userId,
            username,
            content,
            isPrivate,
            optimisticId
          })
        } catch (error) {
          lastResult = null
        }

        if (lastResult && lastResult.success) {
          return { result: lastResult, attemptsMade }
        }
      }

      return { result: lastResult, attemptsMade }
    },
    [roomId, userId, username, sendMessageMutation, updateMessageById]
  )

  // Create unified message sender function
  const sendMessage = useCallback(
    async (content: string, isPrivate = false): Promise<string | null> => {
      if (!content.trim()) return null
      const trimmedContent = content.trim()

      // If offline, delegate to queue-based sender
      if (!isConnected) {
        return await sendMessageWithQueue(trimmedContent, isPrivate)
      }

      const optimisticId = crypto.randomUUID()
      const baseMessage: ChatMessage = {
        id: optimisticId,
        content: trimmedContent,
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
        isPending: false
      }

      const optimisticMessage: ChatMessage = {
        ...baseMessage,
        isPending: false,
        isQueued: false,
        isRetrying: false,
        isFailed: false,
        isOptimistic: true,
        optimisticTimestamp: Date.now()
      }

      onConfirmedMessageUpdate((current) => [...current, optimisticMessage])

      try {
        const sendResult = await sendWithRetries({
          optimisticId,
          content: trimmedContent,
          isPrivate
        })

        if (sendResult?.result && sendResult.result.success) {
          applySuccess(optimisticId, sendResult.result, isPrivate)
          return sendResult.result.message?.id || null
        }

        applyFailure(optimisticId, sendResult?.attemptsMade ?? 1)
        return null
      } catch (error) {
        console.error('Network error sending message:', error)
        applyFailure(optimisticId, MAX_RETRY_ATTEMPTS)
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
      sendWithRetries,
      applySuccess,
      applyFailure
    ]
  )

  const retryMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      const message = confirmedMessages.find((msg) => msg.id === messageId)

      if (!message || !message.isFailed) {
        return await retryMessageWithQueue(messageId)
      }

      if (!isConnected) {
        return await retryMessageWithQueue(messageId)
      }

      updateMessageById(messageId, (current) => ({
        ...current,
        isFailed: false,
        isRetrying: true,
        isPending: true,
        isQueued: false,
        isOptimistic: true,
        isOptimisticConfirmed: false,
        optimisticTimestamp: Date.now()
      }))

      const sendResult = await sendWithRetries({
        optimisticId: messageId,
        content: message.content,
        isPrivate: !!message.isPrivate
      })

      if (sendResult?.result && sendResult.result.success) {
        applySuccess(messageId, sendResult.result, !!message.isPrivate)
        return true
      }

      applyFailure(messageId, sendResult?.attemptsMade ?? 1)
      return false
    },
    [
      confirmedMessages,
      isConnected,
      retryMessageWithQueue,
      sendWithRetries,
      applySuccess,
      applyFailure,
      updateMessageById
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
