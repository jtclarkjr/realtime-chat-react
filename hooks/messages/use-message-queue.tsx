'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ChatMessage } from '@/lib/types/database'

interface QueuedMessage extends ChatMessage {
  originalContent: string
  isPrivate: boolean
  attempts: number
  queuedAt: number
}

interface UseMessageQueueProps {
  roomId: string
  userId: string
  isConnected: boolean
  onProcessMessage: (message: QueuedMessage) => Promise<boolean>
}

const MAX_RETRY_ATTEMPTS = 2
const QUEUE_STORAGE_KEY = 'chat_message_queue'

export function useMessageQueue({
  roomId,
  userId,
  isConnected,
  onProcessMessage
}: UseMessageQueueProps) {
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([])
  const [isProcessingQueue, setIsProcessingQueue] = useState(false)
  const processingRef = useRef(false)

  // Load queued messages from localStorage on mount
  useEffect(() => {
    try {
      const storedQueue = localStorage.getItem(
        `${QUEUE_STORAGE_KEY}_${roomId}_${userId}`
      )
      if (storedQueue) {
        const parsed = JSON.parse(storedQueue)
        setQueuedMessages(parsed)
      }
    } catch (error) {
      console.error('Failed to load message queue from storage:', error)
    }
  }, [roomId, userId])

  // Save queued messages to localStorage whenever queue changes
  useEffect(() => {
    try {
      const key = `${QUEUE_STORAGE_KEY}_${roomId}_${userId}`
      if (queuedMessages.length > 0) {
        localStorage.setItem(key, JSON.stringify(queuedMessages))
      } else {
        localStorage.removeItem(key)
      }
    } catch (error) {
      console.error('Failed to save message queue to storage:', error)
    }
  }, [queuedMessages, roomId, userId])

  // Add message to queue
  const queueMessage = useCallback(
    (
      message: ChatMessage,
      originalContent: string,
      isPrivate: boolean = false
    ): QueuedMessage => {
      const queuedMessage: QueuedMessage = {
        ...message,
        originalContent,
        isPrivate,
        attempts: 0,
        queuedAt: Date.now(),
        isQueued: true,
        isPending: false,
        isFailed: false,
        isRetrying: false
      }

      setQueuedMessages((prev) => [...prev, queuedMessage])
      return queuedMessage
    },
    []
  )

  // Remove message from queue
  const removeFromQueue = useCallback((messageId: string): void => {
    setQueuedMessages((prev) => prev.filter((msg) => msg.id !== messageId))
  }, [])

  // Process queue when connection is restored
  const processQueue = useCallback(async (): Promise<void> => {
    if (!isConnected || processingRef.current || queuedMessages.length === 0) {
      return
    }

    processingRef.current = true
    setIsProcessingQueue(true)

    try {
      // Process messages one by one to avoid overwhelming the server
      for (const queuedMessage of queuedMessages) {
        try {
          // Update message state to show it's being retried
          setQueuedMessages((prev) =>
            prev.map((msg) =>
              msg.id === queuedMessage.id
                ? { ...msg, isRetrying: true, isQueued: false, isPending: true }
                : msg
            )
          )

          const success = await onProcessMessage(queuedMessage)

          if (success) {
            // Remove from queue on success
            setQueuedMessages((prev) =>
              prev.filter((msg) => msg.id !== queuedMessage.id)
            )
          } else {
            // Increment attempt counter
            const newAttempts = queuedMessage.attempts + 1

            if (newAttempts >= MAX_RETRY_ATTEMPTS) {
              // Mark as failed after max attempts
              setQueuedMessages((prev) =>
                prev.map((msg) =>
                  msg.id === queuedMessage.id
                    ? {
                        ...msg,
                        isFailed: true,
                        isRetrying: false,
                        isQueued: false,
                        isPending: false,
                        attempts: newAttempts
                      }
                    : msg
                )
              )
            } else {
              // Queue for another attempt
              setQueuedMessages((prev) =>
                prev.map((msg) =>
                  msg.id === queuedMessage.id
                    ? {
                        ...msg,
                        isQueued: true,
                        isRetrying: false,
                        isPending: false,
                        attempts: newAttempts
                      }
                    : msg
                )
              )
            }
          }
        } catch (error) {
          console.error('Error processing queued message:', error)
          // Mark this specific message as failed
          setQueuedMessages((prev) =>
            prev.map((msg) =>
              msg.id === queuedMessage.id
                ? {
                    ...msg,
                    isFailed: true,
                    isRetrying: false,
                    isQueued: false,
                    isPending: false,
                    attempts: queuedMessage.attempts + 1
                  }
                : msg
            )
          )
        }

        // Small delay between processing messages
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } finally {
      setIsProcessingQueue(false)
      processingRef.current = false
    }
  }, [isConnected, queuedMessages, onProcessMessage])

  // Auto-process queue when connection is restored
  useEffect(() => {
    if (
      isConnected &&
      queuedMessages.some((msg) => msg.isQueued && !msg.isFailed)
    ) {
      // Add a small delay to allow WebSocket to stabilize after network reconnection
      const timeoutId = setTimeout(() => {
        processQueue()
      }, 1000)

      return () => clearTimeout(timeoutId)
    }
  }, [isConnected, processQueue, queuedMessages])

  // Get current queue status
  const getQueueStatus = useCallback((): {
    totalQueued: number
    pending: number
    failed: number
    isProcessing: boolean
  } => {
    const pending = queuedMessages.filter(
      (msg) => msg.isQueued || msg.isPending || msg.isRetrying
    )
    const failed = queuedMessages.filter((msg) => msg.isFailed)

    return {
      totalQueued: queuedMessages.length,
      pending: pending.length,
      failed: failed.length,
      isProcessing: isProcessingQueue
    }
  }, [queuedMessages, isProcessingQueue])

  // Retry a specific failed message
  const retryMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      const message = queuedMessages.find(
        (msg) => msg.id === messageId && msg.isFailed
      )
      if (!message || !isConnected) return false

      // Reset message state for retry
      setQueuedMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                isFailed: false,
                isRetrying: true,
                isQueued: false,
                isPending: true
              }
            : msg
        )
      )

      try {
        const success = await onProcessMessage(message)

        if (success) {
          removeFromQueue(messageId)
          return true
        } else {
          // Mark as failed again
          setQueuedMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    isFailed: true,
                    isRetrying: false,
                    isPending: false,
                    attempts: message.attempts + 1
                  }
                : msg
            )
          )
          return false
        }
      } catch (error) {
        console.error('Error retrying message:', error)
        setQueuedMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  isFailed: true,
                  isRetrying: false,
                  isPending: false,
                  attempts: message.attempts + 1
                }
              : msg
          )
        )
        return false
      }
    },
    [queuedMessages, isConnected, onProcessMessage, removeFromQueue]
  )

  // Clear all failed messages
  const clearFailedMessages = useCallback((): void => {
    setQueuedMessages((prev) => prev.filter((msg) => !msg.isFailed))
  }, [])

  return {
    queuedMessages,
    queueMessage,
    removeFromQueue,
    processQueue,
    retryMessage,
    clearFailedMessages,
    getQueueStatus,
    isProcessingQueue
  }
}
