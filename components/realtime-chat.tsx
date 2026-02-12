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
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'
import { track } from '@vercel/analytics/react'
import { toast } from 'sonner'

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
    streamingMessages,
    addOrUpdateStreamingMessage,
    clearStreamingMessage
  } = useStreamingMessages()

  const handleRemoteAIStreamingMessage = useCallback(
    (message: ChatMessage) => {
      addOrUpdateStreamingMessage(message)
    },
    [addOrUpdateStreamingMessage]
  )

  const handleRemoteAIStreamTerminated = useCallback(
    (streamId: string) => {
      clearStreamingMessage(streamId)
    },
    [clearStreamingMessage]
  )

  // When a confirmed AI broadcast arrives, clear the requester's streaming
  // entry so both the requester and other users render the same message object.
  const handleAIBroadcastReceived = useCallback(
    (message: ChatMessage) => {
      // Clear by persisted message ID (the streaming entry after SSE complete)
      clearStreamingMessage(message.id)
      // Clear by streamSourceId (the streaming entry during SSE streaming)
      if (message.streamSourceId) {
        clearStreamingMessage(message.streamSourceId)
      }
    },
    [clearStreamingMessage]
  )

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
    userAvatarUrl,
    onAIStreamingMessage: handleRemoteAIStreamingMessage,
    onAIStreamTerminated: handleRemoteAIStreamTerminated,
    onAIBroadcastReceived: handleAIBroadcastReceived
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
    sendAIMessage,
    generateReplyDraft
  } = useAIChat({
    roomId,
    userId,
    isConnected,
    onStreamingMessage: (message) => {
      addOrUpdateStreamingMessage(message)
    },
    onRemoveStreamingMessage: (messageId) => {
      clearStreamingMessage(messageId)
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
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(
    null
  )
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const hasHydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  )
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
    roomId,
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
        const existingBroadcastMessage = realtimeMessages.find((msg) => {
          if (!msg.isAI || msg.isStreaming) return false

          if (msg.streamSourceId) {
            return msg.streamSourceId === streamingMessage.id
          }

          return (
            msg.content === streamingMessage.content &&
            msg.content &&
            msg.content.trim().length > 0
          )
        })

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

  const handleReplyWithAI = useCallback(
    async (selectedMessage: ChatMessage, customPrompt?: string) => {
      const selectedMessageId = selectedMessage.serverId || selectedMessage.id
      const selectedMessageContent = selectedMessage.content.trim()

      if (!selectedMessageId || !selectedMessageContent) {
        toast.error('Unable to generate a reply for this message')
        return
      }

      setReplyingMessageId(selectedMessageId)

      try {
        const recentMessages = allMessages
          .filter((message) => !message.isDeleted)
          .slice(-10)

        const selectedInRecentMessages = recentMessages.some(
          (message) =>
            (message.serverId || message.id) === selectedMessageId &&
            message.content.trim() === selectedMessageContent
        )

        const previousMessages = selectedInRecentMessages
          ? recentMessages
          : [...recentMessages, selectedMessage]

        const generatedReply = await generateReplyDraft({
          previousMessages,
          targetMessage: {
            id: selectedMessageId,
            content: selectedMessageContent
          },
          customPrompt
        })

        setNewMessage(generatedReply)
        setIsAIEnabled(!!selectedMessage.isAI)
        inputRef.current?.focus()
      } catch (error) {
        console.error('Failed to generate AI reply:', error)
        toast.error('Failed to generate AI reply')
        throw error
      } finally {
        setReplyingMessageId(null)
      }
    },
    [allMessages, generateReplyDraft, setIsAIEnabled]
  )

  const isReplyingWithAI = useCallback(
    (messageId: string) => replyingMessageId === messageId,
    [replyingMessageId]
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
        userId={userId}
        onRetry={retryMessage}
        onUnsend={unsendMessage}
        isUnsending={isUnsending}
        onReplyWithAI={handleReplyWithAI}
        isReplyingWithAI={isReplyingWithAI}
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
        inputRef={inputRef}
      />
    </div>
  )
}
