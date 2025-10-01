'use client'

import { forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatMessageItem } from '@/components/chat-message'
import { ScrollDateIndicator } from '@/components/chat'
import { useScrollDateDetection } from '@/hooks/ui'
import type { ChatMessage } from '@/lib/types/database'

interface ChatMessageListProps {
  messages: ChatMessage[]
  loading: boolean
  isConnected: boolean
  username: string
  userId: string
  initialMessagesLength: number
  onRetry: (messageId: string) => void
  onUnsend?: (messageId: string) => void
  isUnsending?: (messageId: string) => boolean
  onUserScroll?: () => void
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
      onRetry,
      onUnsend,
      isUnsending,
      onUserScroll
    },
    ref
  ) => {
    const { scrollDate, isScrolling, handleScroll } = useScrollDateDetection({
      messages
    })

    const handleCombinedScroll = (e: React.UIEvent<HTMLDivElement>) => {
      handleScroll(e)
      onUserScroll?.()
    }

    return (
      <>
        <ScrollDateIndicator date={scrollDate} isVisible={isScrolling} />
        <div
          ref={ref}
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-4"
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
          onScroll={handleCombinedScroll}
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
            <AnimatePresence mode="popLayout" initial={false}>
              <div className="space-y-1 sm:space-y-2">
                {messages
                  .filter((message) => !message.isDeleted)
                  .map((message, index, filteredMessages) => {
                    const prevMessage =
                      index > 0 ? filteredMessages[index - 1] : null
                    const showHeader =
                      !prevMessage ||
                      prevMessage.user.name !== message.user.name
                    const shouldAnimate = !message.isOptimistic

                    return shouldAnimate ? (
                      <motion.div
                        key={message.id}
                        data-message-id={message.id}
                        exit={{
                          opacity: 0,
                          height: 0,
                          marginTop: 0,
                          marginBottom: 0,
                          transition: { duration: 0.3, ease: 'easeInOut' }
                        }}
                      >
                        <ChatMessageItem
                          message={message}
                          isOwnMessage={message.user.name === username}
                          showHeader={showHeader}
                          currentUserId={userId}
                          onRetry={onRetry}
                          onUnsend={onUnsend}
                          isUnsending={isUnsending}
                        />
                      </motion.div>
                    ) : (
                      <div key={message.id} data-message-id={message.id}>
                        <ChatMessageItem
                          message={message}
                          isOwnMessage={message.user.name === username}
                          showHeader={showHeader}
                          currentUserId={userId}
                          onRetry={onRetry}
                          onUnsend={onUnsend}
                          isUnsending={isUnsending}
                        />
                      </div>
                    )
                  })}
              </div>
            </AnimatePresence>
          )}
        </div>
      </>
    )
  }
)

ChatMessageList.displayName = 'ChatMessageList'
