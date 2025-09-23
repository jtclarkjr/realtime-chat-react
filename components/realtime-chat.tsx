'use client'

import { cn } from '@/lib/utils'
import { ChatMessageItem } from '@/components/chat-message'
import { useChatScroll } from '@/hooks/use-chat-scroll'
import { useRealtimeChat } from '@/hooks/use-realtime-chat'
import { useAIChat } from '@/hooks/use-ai-chat'
import type { ChatMessage } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AIBadge } from '@/components/ui/ai-badge'
import { Send, Wifi, WifiOff, Clock, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface RealtimeChatProps {
  roomId: string
  username: string
  userId: string
  onMessage?: (messages: ChatMessage[]) => void
  messages?: ChatMessage[]
}

function getPlaceholderText(
  loading: boolean,
  isAILoading: boolean,
  isAIEnabled: boolean,
  isConnected: boolean
): string {
  if (loading) return 'Connecting...'
  if (isAILoading) return 'AI is responding...'
  if (!isConnected && !loading)
    return isAIEnabled ? 'Ask AI (offline)...' : 'Type message (offline)...'
  if (isAIEnabled) return 'Ask AI assistant...'
  return 'Type a message...'
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
  const allMessages = useMemo(() => {
    const mergedMessages = [...initialMessages, ...realtimeMessages]

    // Handle streaming message and potential duplicates
    if (streamingMessage) {
      // Check if there's already a broadcast message with the same ID
      const existingBroadcastMessage = mergedMessages.find(
        (msg) => msg.id === streamingMessage.id && msg !== streamingMessage
      )

      if (existingBroadcastMessage && !streamingMessage.isPrivate) {
        // Public message: broadcast exists, clear streaming message
        setTimeout(() => setStreamingMessage(null), 0)
        // Don't add streaming message since broadcast already exists
      } else {
        // Either no broadcast yet, or this is a private message (which won't have broadcasts)
        mergedMessages.push(streamingMessage)
      }
    }

    // Remove duplicates based on message id and filter out invalid messages
    const uniqueMessages = mergedMessages.filter((message, index, self) => {
      // Filter out messages without content or invalid structure
      if (
        !message ||
        !message.id ||
        (!message.content?.trim() && message !== streamingMessage) || // Allow empty content for streaming messages
        !message.user?.name
      ) {
        return false
      }

      // Filter out private messages that don't belong to current user
      // Private messages should only be visible to the user who requested them
      if (message.isPrivate && message.requesterId !== userId) {
        return false
      }

      // For messages with the same ID, prefer non-streaming (broadcast) messages
      const duplicateIndex = self.findIndex((m) => m?.id === message.id)
      if (duplicateIndex !== index) {
        // This is a duplicate - prefer broadcast messages over streaming
        const firstOccurrence = self[duplicateIndex]
        const isStreamingMessage =
          message.isStreaming || message === streamingMessage
        const isFirstStreaming =
          firstOccurrence?.isStreaming || firstOccurrence === streamingMessage

        if (isStreamingMessage && !isFirstStreaming) {
          return false // Remove streaming message in favor of broadcast
        }
        if (isFirstStreaming && !isStreamingMessage) {
          return true // Keep broadcast message over streaming
        }
      }

      return duplicateIndex === index // Keep first occurrence for non-conflicting cases
    })

    // Sort by creation date with null checks
    const sortedMessages = uniqueMessages.sort((a, b) => {
      const dateA = a.createdAt || new Date().toISOString()
      const dateB = b.createdAt || new Date().toISOString()
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    })

    return sortedMessages
  }, [initialMessages, realtimeMessages, streamingMessage, userId])

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
      {/* Connection and Queue Status Bar (offline) */}
      {!isConnected && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border text-xs">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-orange-500" />
            )}
            <span
              className={isConnected ? 'text-green-600' : 'text-orange-600'}
            >
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
          {(queueStatus.pending > 0 || queueStatus.failed > 0) && (
            <div className="flex items-center gap-3">
              {queueStatus.pending > 0 && (
                <div className="flex items-center gap-1 text-orange-600">
                  <Clock className="h-3 w-3" />
                  <span>{queueStatus.pending} queued</span>
                </div>
              )}
              {queueStatus.failed > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{queueStatus.failed} failed</span>
                  <button
                    onClick={clearFailedMessages}
                    className="ml-1 px-1 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-4"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {loading && initialMessages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <div>Connecting to chat...</div>
          </div>
        ) : !loading && allMessages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <div>No messages yet. Start the conversation!</div>
          </div>
        ) : null}
        {(initialMessages.length > 0 || (!loading && isConnected)) && (
          <div className="space-y-1 sm:space-y-2">
            {allMessages.map((message, index) => {
              const prevMessage = index > 0 ? allMessages[index - 1] : null
              const showHeader =
                !prevMessage || prevMessage.user.name !== message.user.name

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.15,
                    ease: 'easeOut'
                  }}
                  className="transform-gpu"
                >
                  <ChatMessageItem
                    message={message}
                    isOwnMessage={message.user.name === username}
                    showHeader={showHeader}
                    currentUserId={userId}
                    onRetry={retryMessage}
                  />
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSendMessage}
        className="flex w-full gap-2 sm:gap-3 border-t border-border p-3 sm:p-4 bg-background/50 backdrop-blur-sm"
        role="form"
        aria-label="Send message"
      >
        <div className="flex-1 relative">
          <Input
            className={cn(
              'w-full rounded-full bg-background text-base sm:text-sm pl-4 pr-16 py-3 sm:py-2 transition-all duration-300 border-2 focus:border-primary',
              (loading || isAILoading) && 'opacity-50 cursor-not-allowed'
            )}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={getPlaceholderText(
              loading,
              isAILoading,
              isAIEnabled,
              isConnected
            )}
            disabled={loading || isAILoading}
            autoComplete="off"
            autoCapitalize="sentences"
            autoFocus={!loading && !isAILoading}
            aria-label="Type your message"
            aria-describedby="ai-status"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <AIBadge
              isActive={isAIEnabled}
              onToggle={() => setIsAIEnabled(!isAIEnabled)}
              isPrivate={isAIPrivate}
              onPrivacyToggle={() => setIsAIPrivate(!isAIPrivate)}
            />
          </div>
        </div>
        {!loading && newMessage.trim() && (
          <Button
            className={cn(
              'aspect-square h-12 w-12 sm:h-10 sm:w-10 rounded-full animate-in fade-in slide-in-from-right-4 duration-300 active:scale-95',
              isConnected
                ? 'bg-primary hover:bg-primary/90'
                : 'bg-orange-500 hover:bg-orange-600'
            )}
            type="submit"
            disabled={loading}
            aria-label={
              isConnected ? 'Send message' : 'Queue message (offline)'
            }
            title={
              isConnected
                ? 'Send message'
                : "You're offline - message will be queued and sent when connection is restored"
            }
          >
            <Send className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden="true" />
          </Button>
        )}
      </form>
    </div>
  )
}
