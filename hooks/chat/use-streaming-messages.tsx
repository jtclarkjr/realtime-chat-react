'use client'

import { useState, useCallback } from 'react'
import type { ChatMessage } from '@/lib/types/database'

export function useStreamingMessages() {
  const [streamingMessages, setStreamingMessages] = useState<
    Map<string, ChatMessage>
  >(new Map())

  const addOrUpdateStreamingMessage = useCallback(
    (message: ChatMessage): void => {
      setStreamingMessages((prev) => {
        const newMap = new Map(prev)
        // Always update/replace the message with the same ID
        newMap.set(message.id, message)
        return newMap
      })
    },
    []
  )

  const removeStreamingMessage = useCallback((messageId: string): void => {
    setStreamingMessages((prev) => {
      const newMap = new Map(prev)
      newMap.delete(messageId)
      return newMap
    })
  }, [])

  const clearStreamingMessage = useCallback((messageId: string): void => {
    // Use setTimeout to avoid React state update conflicts
    setTimeout(() => {
      setStreamingMessages((prev) => {
        const newMap = new Map(prev)
        newMap.delete(messageId)
        return newMap
      })
    }, 0)
  }, [])

  const getStreamingMessagesArray = useCallback((): ChatMessage[] => {
    return Array.from(streamingMessages.values())
  }, [streamingMessages])

  return {
    streamingMessages: getStreamingMessagesArray(),
    addOrUpdateStreamingMessage,
    removeStreamingMessage,
    clearStreamingMessage
  }
}
