'use client'

import {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatMessageItem } from '@/components/chat-message'
import { ScrollDateIndicator, NewMessagesDivider } from '@/components/chat'
import { useScrollDateDetection, useVirtualizer } from '@/hooks/ui'
import type { ChatMessage } from '@/lib/types/database'

interface ChatMessageListProps {
  messages: ChatMessage[]
  loading: boolean
  isConnected: boolean
  userId: string
  initialMessagesLength: number
  onRetry: (messageId: string) => void
  onUnsend?: (messageId: string) => void
  isUnsending?: (messageId: string) => boolean
  onUserScroll?: () => void
  lastReadMessageId?: string | null
  lastReadTimestamp?: string | null
  currentSessionId?: string
  isAnonymous?: boolean
}

export const ChatMessageList = forwardRef<HTMLDivElement, ChatMessageListProps>(
  (
    {
      messages,
      loading,
      isConnected,
      userId,
      initialMessagesLength,
      onRetry,
      onUnsend,
      isUnsending,
      onUserScroll,
      lastReadMessageId,
      lastReadTimestamp,
      currentSessionId
      isAnonymous = false
    },
    ref
  ) => {
    const { scrollDate, isScrolling, handleScroll } = useScrollDateDetection()
    const filteredMessages = useMemo(
      () => messages.filter((message) => !message.isDeleted),
      [messages]
    )
    const enableVirtualization = filteredMessages.length > 150
    const enableAnimations = filteredMessages.length < 200
    const scrollContainerRef = useRef<HTMLDivElement | null>(null)
    const [initialDividerMessageId, setInitialDividerMessageId] = useState<
      string | null
    >(null)

    const setCombinedRef = useCallback(
      (node: HTMLDivElement | null) => {
        scrollContainerRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref]
    )

    const rowVirtualizer = useVirtualizer({
      count: filteredMessages.length,
      getScrollElement: () => scrollContainerRef.current,
      estimateSize: () => 72,
      overscan: 8
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

      const lastReadIndex = filteredMessages.findIndex(
        (msg) => msg.id === lastReadMessageId
      )

      // No divider if last read message not found or is the last message
      if (
        lastReadIndex === -1 ||
        lastReadIndex === filteredMessages.length - 1
      ) {
        return { shouldShowDivider: false, dividerAfterMessageId: null }
      }

      // Check if there are new messages after the last read message
      const hasNewMessages = lastReadIndex < filteredMessages.length - 1

      if (!hasNewMessages) {
        return { shouldShowDivider: false, dividerAfterMessageId: null }
      }

      // Check if the new messages are from a different day
      // const lastReadDate = new Date(lastReadTimestamp)
      // const firstNewMessage = filteredMessages[lastReadIndex + 1]
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
    }, [
      filteredMessages,
      lastReadMessageId,
      lastReadTimestamp,
      currentSessionId
    ])

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
      initialDividerMessageId !== null && currentSessionId !== null

    return (
      <>
        <ScrollDateIndicator date={scrollDate} isVisible={isScrolling} />
        <div
          ref={setCombinedRef}
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
            <>
              {enableVirtualization ? (
                <div
                  className="relative"
                  style={{ height: rowVirtualizer.getTotalSize() }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const message = filteredMessages[virtualRow.index]
                    if (!message) return null
                    const prevMessage =
                      virtualRow.index > 0
                        ? filteredMessages[virtualRow.index - 1]
                        : null
                    const showHeader =
                      !prevMessage ||
                      prevMessage.user.name !== message.user.name
                    const showDividerAfterThis =
                      showDivider && message.id === initialDividerMessageId
                      !prevMessage || prevMessage.user.id !== message.user.id

                    return (
                      <div
                        key={virtualRow.key}
                        ref={rowVirtualizer.measureElement}
                        className="pb-3 sm:pb-4"
                        data-index={virtualRow.index}
                        data-message-id={message.id}
                        data-message-date={message.createdAt || ''}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`
                        }}
                      >
                        <ChatMessageItem
                          message={message}
                          isOwnMessage={message.user.id === userId}
                          showHeader={showHeader}
                          currentUserId={userId}
                          onRetry={onRetry}
                          onUnsend={onUnsend}
                          isUnsending={isUnsending}
                          isAnonymous={isAnonymous}
                        />
                        {showDividerAfterThis && <NewMessagesDivider />}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <AnimatePresence mode="popLayout" initial={false}>
                  <div className="flex flex-col">
                    {filteredMessages.map((message, index, currentMessages) => {
                      const prevMessage =
                        index > 0 ? currentMessages[index - 1] : null
                      const showHeader =
                        !prevMessage || prevMessage.user.id !== message.user.id
                      const shouldAnimate =
                        enableAnimations && !message.isOptimistic
                      const showDividerAfterThis =
                        showDivider && message.id === initialDividerMessageId

                      return shouldAnimate ? (
                        <motion.div
                          key={message.id}
                          className="pb-3 sm:pb-4"
                          data-message-id={message.id}
                          data-message-date={message.createdAt || ''}
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
                            isOwnMessage={message.user.id === userId}
                            showHeader={showHeader}
                            currentUserId={userId}
                            onRetry={onRetry}
                            onUnsend={onUnsend}
                            isUnsending={isUnsending}
                            isAnonymous={isAnonymous}
                          />
                          {showDividerAfterThis && <NewMessagesDivider />}
                        </motion.div>
                      ) : (
                        <div
                          key={message.id}
                          className="pb-3 sm:pb-4"
                          data-message-id={message.id}
                          data-message-date={message.createdAt || ''}
                        >
                          <ChatMessageItem
                            message={message}
                            isOwnMessage={message.user.id === userId}
                            showHeader={showHeader}
                            currentUserId={userId}
                            onRetry={onRetry}
                            onUnsend={onUnsend}
                            isUnsending={isUnsending}
                            isAnonymous={isAnonymous}
                          />
                          {showDividerAfterThis && <NewMessagesDivider />}
                        </div>
                      )
                    })}
                  </div>
                </AnimatePresence>
              )}
            </>
          )}
        </div>
      </>
    )
  }
)

ChatMessageList.displayName = 'ChatMessageList'
