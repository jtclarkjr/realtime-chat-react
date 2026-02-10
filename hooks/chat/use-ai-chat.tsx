'use client'

import { useCallback, useState } from 'react'
import { streamAIMessage } from '@/lib/api/client'
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
    previousMessages: ChatMessage[],
    triggerMessageId?: string
  ) => Promise<void>
  generateReplyDraft: (params: {
    previousMessages: ChatMessage[]
    targetMessage: {
      id: string
      content: string
    }
    customPrompt?: string
  }) => Promise<string>
}

interface StreamAIResponseOptions {
  content: string
  previousMessages: ChatMessage[]
  triggerMessageId?: string
  targetMessage?: {
    id: string
    content: string
  }
  customPrompt?: string
  draftOnly?: boolean
  onStart?: (messageId: string, user: ChatMessage['user']) => void
  onContent?: (fullContent: string, messageId: string) => void
  onComplete?: (payload: {
    fullContent: string
    messageId: string
    createdAt?: string
  }) => void
}

export function useAIChat({
  roomId,
  userId,
  isConnected,
  onStreamingMessage,
  onCompleteMessage
}: UseAIChatProps): UseAIChatReturn {
  const [isAIEnabled, setIsAIEnabled] = useState<boolean>(false)
  const [isAIPrivate, setIsAIPrivate] = useState<boolean>(false)
  const [isAILoading, setIsAILoading] = useState<boolean>(false)

  const streamAIResponse = useCallback(
    async ({
      content,
      previousMessages = [],
      triggerMessageId,
      targetMessage,
      customPrompt,
      draftOnly = false,
      onStart,
      onContent,
      onComplete
    }: StreamAIResponseOptions): Promise<void> => {
      // Prepare context from previous messages
      const messageContext = previousMessages.map((msg) => ({
        content: msg.content,
        isAi: msg.isAI || false,
        userName: msg.user.name
      }))

      // Call AI streaming API
      const response = await streamAIMessage({
        roomId,
        userId,
        message: content.trim(),
        responseFormat: 'markdown',
        previousMessages: messageContext,
        isPrivate: isAIPrivate,
        triggerMessageId,
        targetMessageId: targetMessage?.id,
        targetMessageContent: targetMessage?.content,
        customPrompt,
        draftOnly
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'start') {
              onStart?.(data.messageId, data.user)
            } else if (data.type === 'content') {
              onContent?.(data.fullContent, data.messageId)
            } else if (data.type === 'complete') {
              onComplete?.({
                fullContent: data.fullContent || '',
                messageId: data.messageId,
                createdAt: data.createdAt
              })
            } else if (data.type === 'error') {
              throw new Error(data.error)
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError) {
              console.error('Error parsing stream data:', parseError)
            } else {
              throw parseError
            }
          }
        }
      }
    },
    [isAIPrivate, roomId, userId]
  )

  const sendAIMessage = useCallback(
    async (
      content: string,
      previousMessages: ChatMessage[] = [],
      triggerMessageId?: string
    ): Promise<void> => {
      if (!isConnected || !content.trim() || isAILoading) return

      setIsAILoading(true)

      try {
        // Ensure we're connected before starting AI response
        if (!isConnected) {
          throw new Error('Not connected to chat')
        }

        // Add a natural delay before AI starts responding (1-2 seconds)
        // const delay = Math.random() * 1000 + 1000 // Random delay between 1-2 seconds
        // await new Promise((resolve) => setTimeout(resolve, delay))

        let streamingMessage: ChatMessage | null = null

        await streamAIResponse({
          content,
          previousMessages,
          triggerMessageId,
          onStart: (messageId, user) => {
            // Initialize streaming message with server's database ID
            streamingMessage = {
              id: messageId,
              content: '',
              user,
              createdAt: new Date().toISOString(),
              roomId,
              isAI: true,
              isStreaming: true,
              isPrivate: isAIPrivate,
              requesterId: userId
            }
            onStreamingMessage(streamingMessage)
          },
          onContent: (fullContent) => {
            if (!streamingMessage) return

            streamingMessage = {
              id: streamingMessage.id,
              user: streamingMessage.user,
              createdAt: streamingMessage.createdAt,
              roomId: streamingMessage.roomId,
              isAI: streamingMessage.isAI,
              isStreaming: streamingMessage.isStreaming,
              isPrivate: streamingMessage.isPrivate,
              requesterId: streamingMessage.requesterId,
              content: fullContent
            }
            onStreamingMessage(streamingMessage)
          },
          onComplete: ({ fullContent, createdAt }) => {
            if (!streamingMessage) return

            const finalMessage: ChatMessage = {
              id: streamingMessage.id,
              user: streamingMessage.user,
              roomId: streamingMessage.roomId,
              isAI: streamingMessage.isAI,
              isPrivate: streamingMessage.isPrivate,
              requesterId: streamingMessage.requesterId,
              content: fullContent,
              createdAt: createdAt || streamingMessage.createdAt,
              isStreaming: false
            }
            onCompleteMessage(finalMessage)
            streamingMessage = null
          }
        })
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
      onCompleteMessage,
      streamAIResponse
    ]
  )

  const generateReplyDraft = useCallback(
    async ({
      previousMessages = [],
      targetMessage,
      customPrompt
    }: {
      previousMessages: ChatMessage[]
      targetMessage: {
        id: string
        content: string
      }
      customPrompt?: string
    }): Promise<string> => {
      if (!isConnected || isAILoading) {
        throw new Error('AI is not available right now')
      }

      const trimmedTargetContent = targetMessage.content.trim()
      if (!trimmedTargetContent) {
        throw new Error('Target message is empty')
      }

      setIsAILoading(true)

      try {
        let generatedText = ''

        await streamAIResponse({
          content:
            customPrompt?.trim() || 'Write a direct reply to this message.',
          previousMessages,
          targetMessage: {
            id: targetMessage.id,
            content: trimmedTargetContent
          },
          customPrompt: customPrompt?.trim() || undefined,
          draftOnly: true,
          onContent: (fullContent) => {
            generatedText = fullContent
          },
          onComplete: ({ fullContent }) => {
            generatedText = fullContent
          }
        })

        const trimmed = generatedText.trim()
        if (!trimmed) {
          throw new Error('No AI reply generated')
        }

        return trimmed
      } finally {
        setIsAILoading(false)
      }
    },
    [isConnected, isAILoading, streamAIResponse]
  )

  return {
    isAIEnabled,
    setIsAIEnabled,
    isAIPrivate,
    setIsAIPrivate,
    isAILoading,
    sendAIMessage,
    generateReplyDraft
  }
}
