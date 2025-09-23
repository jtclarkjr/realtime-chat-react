'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { ChatMessageItem } from '@/components/chat-message'
import type { ChatMessage } from '@/lib/types/database'

interface ChatMessageListProps {
  messages: ChatMessage[]
  loading: boolean
  isConnected: boolean
  username: string
  userId: string
  initialMessagesLength: number
  onRetry: (messageId: string) => void
}

export const ChatMessageList = forwardRef<HTMLDivElement, ChatMessageListProps>(
  (
    {
      messages,
      loading,
      isConnected,
      username,
      userId,
      initialMessagesLength,
      onRetry
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-4"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {loading && initialMessagesLength === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <div>Connecting to chat...</div>
          </div>
        ) : !loading && messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <div>No messages yet. Start the conversation!</div>
          </div>
        ) : null}
        {(initialMessagesLength > 0 || (!loading && isConnected)) && (
          <div className="space-y-1 sm:space-y-2">
            {messages.map((message, index) => {
              const prevMessage = index > 0 ? messages[index - 1] : null
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
                    onRetry={onRetry}
                  />
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    )
  }
)

ChatMessageList.displayName = 'ChatMessageList'
