'use client'

import { useChatScroll, useSmartAutoScroll } from '@/hooks/ui'
import { useRealtimeChat, useAIChat, useStreamingMessages } from '@/hooks/chat'
import { useMessageMerging, useUnsendMessage } from '@/hooks/messages'
import {
  ConnectionStatusBar,
  ChatMessageList,
  ChatInput,
  NewMessagesBadge
} from '@/components/chat'
import type { ChatMessage } from '@/lib/types/database'
import type { PresenceState } from '@/lib/types/presence'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { track } from '@vercel/analytics/react'

interface RealtimeChatProps {
  roomId: string
  username: string
  userId: string
  userAvatarUrl?: string
  onMessage?: (messages: ChatMessage[]) => void
  messages?: ChatMessage[]
  onPresenceChange?: (users: PresenceState) => void
  isAnonymous?: boolean
}

const subscribeNoop = () => () => {}

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
  messages: initialMessages = [],
  onPresenceChange,
  isAnonymous = false
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
    clearFailedMessages,
    markMessageAsDeleted,
    deletedMessageIds,
    presenceUsers
  } = useRealtimeChat({
    roomId,
    username,
    userId,
    userAvatarUrl
  })

  // Initialize unsend message
  const { unsendMessage, isUnsending } = useUnsendMessage({
    userId,
    roomId,
    markMessageAsDeleted
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
  const hasHydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  )
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
    userId,
    deletedMessageIds
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

  const effectiveIsConnected = hasHydrated ? isConnected : true

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

  useEffect(() => {
    if (onPresenceChange) {
      onPresenceChange(presenceUsers)
    }
  }, [presenceUsers, onPresenceChange])

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      // Prevent sending if loading (but allow offline sending - will be queued)
      if (!newMessage.trim() || loading || isAILoading) return

      const messageContent = newMessage.trim()
      setNewMessage('')

      if (isAIEnabled) {
        // First send the user's message (private if AI is in private mode)
        const triggerMessageId = await sendMessage(messageContent, isAIPrivate)
        // Then send to AI for response with recent messages as context
        // Pass the trigger message ID so it can be marked as having an AI response
        await sendAIMessage(
          messageContent,
          allMessages.slice(-10),
          triggerMessageId || undefined
        )

        if (isAIPrivate) {
          track('event_ai_private_message_sent')
        } else {
          track('event_ai_public_message_sent')
        }
      } else {
        // Send regular message
        sendMessage(messageContent)
      }
    },
    [
      newMessage,
      setNewMessage,
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
    <div className="relative flex flex-col h-full w-full bg-background text-foreground antialiased">
      <ConnectionStatusBar
        isConnected={effectiveIsConnected}
        queueStatus={queueStatus}
        onClearFailedMessages={clearFailedMessages}
      />

      <ChatMessageList
        ref={containerRef}
        messages={allMessages}
        loading={loading}
        isConnected={effectiveIsConnected}
        userId={userId}
        initialMessagesLength={initialMessages.length}
        onRetry={retryMessage}
        onUnsend={unsendMessage}
        isUnsending={isUnsending}
        onUserScroll={handleUserScroll}
        isAnonymous={isAnonymous}
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
        isConnected={effectiveIsConnected}
        isAIEnabled={isAIEnabled}
        setIsAIEnabled={setIsAIEnabled}
        isAIPrivate={isAIPrivate}
        setIsAIPrivate={setIsAIPrivate}
        isAILoading={isAILoading}
        isAnonymous={isAnonymous}
      />
    </div>
  )
}
