'use client'

import { cn } from '@/lib/utils'
import { StreamingIndicator } from './streaming-indicator'
import { MessageOptions } from './message-options'
import type { ChatMessage } from '@/lib/types/database'

interface MessageBubbleProps {
  message: ChatMessage
  isOwnMessage: boolean
  isAIMessage: boolean
  isPrivateForCurrentUser: boolean
  isStreaming: boolean
  isUnsending?: boolean
  onUnsend?: (messageId: string) => void
}

export const MessageBubble = ({
  message,
  isOwnMessage,
  isAIMessage,
  isPrivateForCurrentUser,
  isStreaming,
  onUnsend,
  isUnsending = false
}: MessageBubbleProps) => {
  const canUnsend =
    isOwnMessage &&
    !isAIMessage &&
    !isStreaming &&
    !message.isDeleted &&
    !message.isFailed &&
    !message.isQueued &&
    !message.isPending &&
    !message.hasAIResponse

  const bubbleContent = (
    <div
      className={cn(
        'py-3 px-4 rounded-2xl text-sm sm:text-base w-fit break-words shadow-sm transition-all duration-200 hover:shadow-md relative',
        {
          'cursor-pointer': canUnsend && onUnsend,
          'bg-primary text-primary-foreground rounded-br-md':
            isOwnMessage &&
            !isPrivateForCurrentUser &&
            !message.isQueued &&
            !message.isPending,
          'bg-yellow-100 dark:bg-yellow-900/30 text-foreground rounded-br-md border border-yellow-300 dark:border-yellow-700 opacity-80':
            isOwnMessage && (message.isQueued || message.isPending),
          'bg-orange-100 dark:bg-orange-900/30 text-foreground border border-orange-200 dark:border-orange-800/50':
            isPrivateForCurrentUser && isAIMessage,
          'bg-gray-100 dark:bg-gray-800/50 text-foreground rounded-br-md border border-gray-300 dark:border-gray-600':
            isPrivateForCurrentUser && isOwnMessage && !isAIMessage,
          'bg-blue-50 dark:bg-blue-900/50 text-foreground rounded-bl-md border border-blue-200 dark:border-blue-700':
            isAIMessage && !isOwnMessage && !isPrivateForCurrentUser,
          'bg-muted text-foreground rounded-bl-md border border-border/50':
            !isOwnMessage && !isAIMessage && !isPrivateForCurrentUser
        }
      )}
    >
      <div
        className="whitespace-pre-wrap leading-relaxed"
        role="text"
        aria-live={isStreaming ? 'polite' : undefined}
      >
        {isStreaming ? <StreamingIndicator /> : message.content}
      </div>
    </div>
  )

  // Only wrap with MessageOptions if user can potentially unsend
  if (canUnsend && onUnsend) {
    return (
      <MessageOptions
        messageId={message.serverId || message.id}
        onUnsend={onUnsend}
        isUnsending={isUnsending}
        canUnsend={canUnsend}
      >
        {bubbleContent}
      </MessageOptions>
    )
  }

  return bubbleContent
}
