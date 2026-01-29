import { memo } from 'react'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/lib/types/database'
import {
  MessageHeader,
  MessageBubble,
  MessageStatusIndicator,
  RetryButton,
  FailedMessageBubble
} from '@/components/chat'
import { AI_USER_ID } from '@/lib/services/ai-user-setup'

interface ChatMessageItemProps {
  message: ChatMessage
  isOwnMessage: boolean
  showHeader: boolean
  currentUserId?: string
  onRetry?: (messageId: string) => void
  onUnsend?: (messageId: string) => void
  isUnsending?: (messageId: string) => boolean
}

const ChatMessageItemComponent = ({
  message,
  isOwnMessage,
  showHeader,
  currentUserId,
  onRetry,
  onUnsend,
  isUnsending
}: ChatMessageItemProps) => {
  const isAIMessage =
    message.isAI || (!!AI_USER_ID && message.user.id === AI_USER_ID)
  const isStreaming =
    isAIMessage && !!(message.isStreaming || !message.content.trim()) // AI message with no content or marked as streaming
  const isPrivateMessage = message.isPrivate
  const isPrivateForCurrentUser = !!(
    isPrivateMessage && message.requesterId === currentUserId
  )

  // Don't render private messages that don't belong to current user
  // Private messages should ONLY be visible to the user who requested them OR the user who sent them
  if (
    isPrivateMessage &&
    message.requesterId !== currentUserId &&
    message.user.id !== currentUserId
  ) {
    return null
  }

  const getMessageAlignment = (): string => {
    if (isOwnMessage) return 'justify-end'
    return 'justify-start'
  }

  return (
    <div
      className={`flex ${getMessageAlignment()}`}
      role="article"
      aria-label={`Message from ${message.user.name}`}
    >
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[75%] md:max-w-[60%] w-fit flex flex-col gap-1',
          {
            'items-end': isOwnMessage
          }
        )}
      >
        {showHeader && (
          <MessageHeader
            message={message}
            isOwnMessage={isOwnMessage}
            isAIMessage={isAIMessage}
            isPrivateForCurrentUser={isPrivateForCurrentUser}
          />
        )}
        {/* Use flexbox layout only for user's failed messages */}
        {message.isFailed && isOwnMessage && onRetry ? (
          <div className="flex items-center gap-2 flex-row-reverse">
            <RetryButton
              messageId={message.id}
              isRetrying={message.isRetrying || false}
              onRetry={onRetry}
            />

            <div className="flex items-center gap-2">
              <FailedMessageBubble content={message.content} />
            </div>
          </div>
        ) : (
          /* Normal message layout for all other messages */
          <div className="flex items-center gap-2">
            <MessageBubble
              message={message}
              isOwnMessage={isOwnMessage}
              isAIMessage={isAIMessage}
              isPrivateForCurrentUser={isPrivateForCurrentUser}
              isStreaming={isStreaming}
              onUnsend={onUnsend}
              isUnsending={
                isUnsending
                  ? isUnsending(message.serverId || message.id)
                  : false
              }
            />

            {/* Status indicators for user's own messages */}
            {isOwnMessage && <MessageStatusIndicator message={message} />}
          </div>
        )}
      </div>
    </div>
  )
}

export const ChatMessageItem = memo(ChatMessageItemComponent)
ChatMessageItem.displayName = 'ChatMessageItem'
