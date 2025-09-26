'use client'

import { useChatScroll } from '@/hooks/use-chat-scroll'
import { useRealtimeChat } from '@/hooks/use-realtime-chat'
import { useAIChat } from '@/hooks/use-ai-chat'
import { useMessageMerging } from '@/hooks/use-message-merging'
import { useStreamingMessages } from '@/hooks/use-streaming-messages'
import { useSmartAutoScroll } from '@/hooks/use-smart-auto-scroll'
import {
  ConnectionStatusBar,
  ChatMessageList,
  ChatInput,
  NewMessagesBadge
} from '@/components/chat'
import type { ChatMessage } from '@/lib/types/database'
import { useCallback, useEffect, useState } from 'react'

interface RealtimeChatProps {
  roomId: string
  username: string
  userId: string
  userAvatarUrl?: string
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
  userAvatarUrl,
  onMessage,
  messages: initialMessages = []
}: RealtimeChatProps) => {
  const { containerRef, scrollToBottom, scrollToBottomInstant } =
    useChatScroll()

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
    userId,
    userAvatarUrl
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
      addOrUpdateStreamingMessage(message)
    },
    onCompleteMessage: (completedMessage) => {
      // Always update the streaming message with completed content
      const finalMessage = { ...completedMessage, isStreaming: false }
      addOrUpdateStreamingMessage(finalMessage)

      // For public messages, the broadcast will eventually replace this
      // For private messages, this stays permanently
    }
  })

  const [newMessage, setNewMessage] = useState<string>('')
  const {
    streamingMessages,
    addOrUpdateStreamingMessage,
    clearStreamingMessage
  } = useStreamingMessages()

  // Merge realtime messages with initial messages and streaming messages
  const allMessages = useMessageMerging({
    initialMessages,
    realtimeMessages,
    streamingMessages,
    userId
  })

  // Smart auto-scroll that only scrolls when appropriate
  const {
    handleUserScroll,
    userHasScrolledUp,
    unreadMessageCount,
    scrollToBottomAndClearUnread
  } = useSmartAutoScroll({
    messages: allMessages,
    containerRef,
    scrollToBottom,
    scrollToBottomInstant
  })

  // Handle clearing streaming messages when broadcast arrives
  useEffect(() => {
    streamingMessages.forEach((streamingMessage) => {
      if (!streamingMessage.isPrivate && streamingMessage.isAI) {
        // For AI messages, check by content and timing since IDs might not match
        const existingBroadcastMessage = realtimeMessages.find(
          (msg) =>
            msg.isAI &&
            msg.content === streamingMessage.content &&
            msg.content &&
            msg.content.trim().length > 0 && // Only match non-empty content
            !msg.isStreaming
        )

        if (existingBroadcastMessage) {
          clearStreamingMessage(streamingMessage.id)
        }
      }
    })
  }, [realtimeMessages, streamingMessages, clearStreamingMessage])

  useEffect(() => {
    if (onMessage) {
      onMessage(allMessages)
    }
  }, [allMessages, onMessage])

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      // Prevent sending if loading (but allow offline sending - will be queued)
      if (!newMessage.trim() || loading || isAILoading) return

      const messageContent = newMessage.trim()
      setNewMessage('')

      if (isAIEnabled) {
        // First send the user's message (private if AI is in private mode)
        await sendMessage(messageContent, isAIPrivate)
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
        onUserScroll={handleUserScroll}
      />

      <NewMessagesBadge
        isVisible={userHasScrolledUp}
        newMessageCount={unreadMessageCount}
        onScrollToBottom={scrollToBottomAndClearUnread}
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
