'use client'

import { forwardRef, useMemo, Fragment, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatMessageItem } from '@/components/chat-message'
import { ScrollDateIndicator, NewMessagesDivider } from '@/components/chat'
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
  lastReadMessageId?: string | null
  lastReadTimestamp?: string | null
  currentSessionId?: string
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
      onUserScroll,
      lastReadMessageId,
      lastReadTimestamp,
      currentSessionId
    },
    ref
  ) => {
    const [initialDividerMessageId, setInitialDividerMessageId] = useState<
      string | null
    >(null)

    const { scrollDate, isScrolling, handleScroll } = useScrollDateDetection({
      messages
    })

    const handleCombinedScroll = (e: React.UIEvent<HTMLDivElement>) => {
      handleScroll(e)
      onUserScroll?.()
    }

    // Determine if we should show the divider and where
    const { shouldShowDivider, dividerAfterMessageId } = useMemo(() => {
      if (!lastReadMessageId || !lastReadTimestamp || !currentSessionId) {
        return { shouldShowDivider: false, dividerAfterMessageId: null }
      }

      const lastReadIndex = messages.findIndex(
        (msg) => msg.id === lastReadMessageId
      )

      // No divider if last read message not found or is the last message
      if (lastReadIndex === -1 || lastReadIndex === messages.length - 1) {
        return { shouldShowDivider: false, dividerAfterMessageId: null }
      }

      // Check if there are new messages after the last read message
      const hasNewMessages = lastReadIndex < messages.length - 1

      if (!hasNewMessages) {
        return { shouldShowDivider: false, dividerAfterMessageId: null }
      }

      // Check if the new messages are from a different day
      // const lastReadDate = new Date(lastReadTimestamp)
      // const firstNewMessage = messages[lastReadIndex + 1]
      // const firstNewMessageDate = new Date(firstNewMessage.createdAt)

      // const isDifferentDay =
      //   lastReadDate.getFullYear() !== firstNewMessageDate.getFullYear() ||
      //   lastReadDate.getMonth() !== firstNewMessageDate.getMonth() ||
      //   lastReadDate.getDate() !== firstNewMessageDate.getDate()

      // Temporarily show divider for all new messages (for testing)
      const isDifferentDay = true

      return {
        shouldShowDivider: isDifferentDay,
        dividerAfterMessageId: isDifferentDay ? lastReadMessageId : null
      }
    }, [messages, lastReadMessageId, lastReadTimestamp, currentSessionId])

    // Capture the initial divider state only on mount
    useEffect(() => {
      if (shouldShowDivider && dividerAfterMessageId) {
        setInitialDividerMessageId(dividerAfterMessageId)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Only show divider if it was present on initial load (not for new messages during session)
    // Use initialDividerMessageId as the stable position, don't depend on recalculated dividerAfterMessageId
    const showDivider =
      initialDividerMessageId !== null &&
      currentSessionId !== null

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
                    const showDividerAfterThis =
                      showDivider && message.id === initialDividerMessageId

                    return (
                      <Fragment key={message.id}>
                        {shouldAnimate ? (
                          <motion.div
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
                          <div data-message-id={message.id}>
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
                        )}
                        {showDividerAfterThis && <NewMessagesDivider />}
                      </Fragment>
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
