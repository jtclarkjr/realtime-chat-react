'use client'

import { useChatScroll } from '@/hooks/use-chat-scroll'
import { useRealtimeChat } from '@/hooks/use-realtime-chat'
import { useAIChat } from '@/hooks/use-ai-chat'
import { useMessageMerging } from '@/hooks/use-message-merging'
import { ConnectionStatusBar, ChatMessageList, ChatInput } from '@/components/chat'
import type { ChatMessage } from '@/lib/types/database'
import { useCallback, useEffect, useState } from 'react'

interface RealtimeChatProps {
  roomId: string
  username: string
  userId: string
  onMessage?: (messages: ChatMessage[]) => void
  messages?: ChatMessage[]
}


/**
 * Realtime chat component
 * @param roomId - The ID of the room to join. Each room is a unique chat.
 * @param username - The username of the user
 * @param onMessage - The callback function to handle the messages. Useful if you want to store the messages in a database.
 * @param messages - The messages to display in the chat. Useful if you want to display messages from a database.
 * @returns The chat component
 */
export const RealtimeChat = ({
  roomId,
  username,
  userId,
  onMessage,
  messages: initialMessages = []
}: RealtimeChatProps) => {
  const { containerRef, scrollToBottom } = useChatScroll()

  const {
    messages: realtimeMessages,
    sendMessage,
    retryMessage,
    isConnected,
    loading,
    queueStatus,
    clearFailedMessages
  } = useRealtimeChat({
    roomId,
    username,
    userId
  })

  const {
    isAIEnabled,
    setIsAIEnabled,
    isAIPrivate,
    setIsAIPrivate,
    isAILoading,
    sendAIMessage
  } = useAIChat({
    roomId,
    userId,
    isConnected,
    onStreamingMessage: (message) => {
      setStreamingMessage(message)
    },
    onCompleteMessage: (completedMessage) => {
      // For private messages, keep the completed message permanently since no broadcast will replace it
      if (completedMessage.isPrivate) {
        // Remove the isStreaming flag and keep the message
        const finalPrivateMessage = { ...completedMessage, isStreaming: false }
        setStreamingMessage(finalPrivateMessage)
      } else {
        // For public messages, update and wait for broadcast replacement
        setStreamingMessage(completedMessage)

        // Set a timeout to clear it in case broadcast fails (only for public messages)
        setTimeout(() => {
          setStreamingMessage((current) => {
            // Only clear if the message hasn't been replaced by broadcast
            if (current && current.id === completedMessage.id) {
              return null
            }
            return current
          })
        }, 2000) // Give broadcast 2 seconds to arrive
      }
    }
  })

  const [newMessage, setNewMessage] = useState<string>('')
  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(
    null
  )

  // Merge realtime messages with initial messages and streaming message
  const allMessages = useMessageMerging({
    initialMessages,
    realtimeMessages,
    streamingMessage,
    userId
  })

  // Handle clearing streaming messages when broadcast arrives
  useEffect(() => {
    if (streamingMessage && !streamingMessage.isPrivate) {
      // Check if there's already a broadcast message with the same ID
      const existingBroadcastMessage = realtimeMessages.find(
        (msg) => msg.id === streamingMessage.id
      )
      
      if (existingBroadcastMessage) {
        // Public message: broadcast exists, clear streaming message
        setTimeout(() => setStreamingMessage(null), 0)
      }
    }
  }, [streamingMessage, realtimeMessages])

  useEffect(() => {
    if (onMessage) {
      onMessage(allMessages)
    }
  }, [allMessages, onMessage])

  useEffect(() => {
    // Scroll to bottom whenever messages change
    scrollToBottom()
  }, [allMessages, scrollToBottom])

  useEffect(() => {
    // Scroll to bottom when streaming message updates
    if (streamingMessage) {
      scrollToBottom()
    }
  }, [streamingMessage, scrollToBottom])

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      // Prevent sending if loading (but allow offline sending - will be queued)
      if (!newMessage.trim() || loading || isAILoading) return

      const messageContent = newMessage.trim()
      setNewMessage('')

      if (isAIEnabled) {
        // First send the user's message (private if AI is in private mode)
        sendMessage(messageContent, isAIPrivate)
        // Then send to AI for response with recent messages as context
        await sendAIMessage(messageContent, allMessages.slice(-10))
      } else {
        // Send regular message
        sendMessage(messageContent)
      }
    },
    [
      newMessage,
      sendMessage,
      sendAIMessage,
      loading,
      isAIEnabled,
      isAIPrivate,
      isAILoading,
      allMessages
    ]
  )

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground antialiased">
      <ConnectionStatusBar
        isConnected={isConnected}
        queueStatus={queueStatus}
        onClearFailedMessages={clearFailedMessages}
      />
      
      <ChatMessageList
        ref={containerRef}
        messages={allMessages}
        loading={loading}
        isConnected={isConnected}
        username={username}
        userId={userId}
        initialMessagesLength={initialMessages.length}
        onRetry={retryMessage}
      />
      
      <ChatInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={handleSendMessage}
        loading={loading}
        isConnected={isConnected}
        isAIEnabled={isAIEnabled}
        setIsAIEnabled={setIsAIEnabled}
        isAIPrivate={isAIPrivate}
        setIsAIPrivate={setIsAIPrivate}
        isAILoading={isAILoading}
      />
    </div>
  )
}
