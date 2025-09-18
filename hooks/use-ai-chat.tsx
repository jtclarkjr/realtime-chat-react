'use client'

import { useCallback, useState } from 'react'
import type { ChatMessage } from '@/lib/types/database'

interface UseAIChatProps {
  roomId: string
  userId: string
  isConnected: boolean
  onStreamingMessage: (message: ChatMessage) => void
  onCompleteMessage: (message: ChatMessage) => void
}

interface UseAIChatReturn {
  isAIEnabled: boolean
  setIsAIEnabled: (enabled: boolean) => void
  isAIPrivate: boolean
  setIsAIPrivate: (isPrivate: boolean) => void
  isAILoading: boolean
  sendAIMessage: (
    content: string,
    previousMessages: ChatMessage[]
  ) => Promise<void>
}

export function useAIChat({
  roomId,
  userId,
  isConnected,
  onStreamingMessage,
  onCompleteMessage
}: UseAIChatProps): UseAIChatReturn {
  const [isAIEnabled, setIsAIEnabled] = useState(false)
  const [isAIPrivate, setIsAIPrivate] = useState(false)
  const [isAILoading, setIsAILoading] = useState(false)

  const sendAIMessage = useCallback(
    async (content: string, previousMessages: ChatMessage[] = []) => {
      if (!isConnected || !content.trim() || isAILoading) return

      setIsAILoading(true)

      try {
        // Ensure we're connected before starting AI response
        if (!isConnected) {
          throw new Error('Not connected to chat')
        }

        // Add a natural delay before AI starts responding (1-2 seconds)
        const delay = Math.random() * 1000 + 1000 // Random delay between 1-2 seconds
        await new Promise((resolve) => setTimeout(resolve, delay))

        // Prepare context from previous messages
        const messageContext = previousMessages.map((msg) => ({
          content: msg.content,
          isAi: msg.isAI || false,
          userName: msg.user.name
        }))

        // Call AI streaming API
        const response = await fetch('/api/ai/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            roomId,
            userId,
            message: content.trim(),
            previousMessages: messageContext,
            isPrivate: isAIPrivate
          })
        })

        if (!response.ok) {
          throw new Error('Failed to get AI response')
        }

        // Handle streaming response
        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let streamingMessage: ChatMessage | null = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.type === 'start') {
                  // Initialize streaming message with temporary ID
                  streamingMessage = {
                    id: data.messageId, // This is the temporary ID
                    content: '',
                    user: data.user,
                    createdAt: new Date().toISOString(),
                    roomId,
                    isAI: true,
                    isStreaming: true, // Mark as streaming message
                    isPrivate: isAIPrivate,
                    requesterId: userId
                  }
                  onStreamingMessage(streamingMessage)
                } else if (data.type === 'content' && streamingMessage) {
                  // Update streaming message content
                  streamingMessage = {
                    id: streamingMessage.id,
                    user: streamingMessage.user,
                    createdAt: streamingMessage.createdAt,
                    roomId: streamingMessage.roomId,
                    isAI: streamingMessage.isAI,
                    isStreaming: streamingMessage.isStreaming,
                    isPrivate: streamingMessage.isPrivate,
                    requesterId: streamingMessage.requesterId,
                    content: data.fullContent
                  }
                  onStreamingMessage(streamingMessage)
                } else if (data.type === 'complete' && streamingMessage) {
                  // Update the streaming message with final database info
                  // Don't clear it yet - let the broadcast message replace it
                  streamingMessage = {
                    id: data.messageId, // Use database ID
                    user: streamingMessage.user,
                    roomId: streamingMessage.roomId,
                    isAI: streamingMessage.isAI,
                    isPrivate: streamingMessage.isPrivate,
                    requesterId: streamingMessage.requesterId,
                    content: data.fullContent,
                    createdAt: data.createdAt
                  }
                  onStreamingMessage(streamingMessage) // Update with final content

                  const finalMessage: ChatMessage = {
                    id: data.messageId,
                    user: streamingMessage.user,
                    roomId: streamingMessage.roomId,
                    isAI: streamingMessage.isAI,
                    isPrivate: streamingMessage.isPrivate,
                    requesterId: streamingMessage.requesterId,
                    content: data.fullContent,
                    createdAt: data.createdAt
                  }
                  onCompleteMessage(finalMessage)

                  // For private messages, don't clear the streaming reference since no broadcast will replace it
                  if (!streamingMessage.isPrivate) {
                    streamingMessage = null
                  }
                } else if (data.type === 'error') {
                  console.error('Streaming error:', data.error)
                  throw new Error(data.error)
                }
              } catch (parseError) {
                console.error('Error parsing stream data:', parseError)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error calling AI streaming API:', error)

        // Show error message in chat
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          content: 'Sorry, I encountered an error. Please try again.',
          user: {
            id: 'ai-assistant',
            name: 'AI Assistant'
          },
          createdAt: new Date().toISOString(),
          roomId,
          isAI: true
        }
        onCompleteMessage(errorMessage)
      } finally {
        setIsAILoading(false)
      }
    },
    [
      isConnected,
      roomId,
      userId,
      isAILoading,
      isAIPrivate,
      onStreamingMessage,
      onCompleteMessage
    ]
  )

  return {
    isAIEnabled,
    setIsAIEnabled,
    isAIPrivate,
    setIsAIPrivate,
    isAILoading,
    sendAIMessage
  }
}
