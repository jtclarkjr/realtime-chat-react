'use client'

import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { StreamingIndicator } from './streaming-indicator'
import { MessageOptions } from './message-options'
import { MarkdownMessageContent } from './markdown-message-content'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { ChatMessage } from '@/lib/types/database'

interface MessageBubbleProps {
  message: ChatMessage
  isOwnMessage: boolean
  isAIMessage: boolean
  isPrivateForCurrentUser: boolean
  isStreaming: boolean
  isUnsending?: boolean
  onUnsend?: (messageId: string) => void
  isAnonymous: boolean
}

export const MessageBubble = ({
  message,
  isOwnMessage,
  isAIMessage,
  isPrivateForCurrentUser,
  isStreaming,
  onUnsend,
  isUnsending = false,
  isAnonymous
}: MessageBubbleProps) => {
  const [isCopied, setIsCopied] = useState(false)

  const canUnsend =
    !isAnonymous &&
    isOwnMessage &&
    !isAIMessage &&
    !isStreaming &&
    !message.isDeleted &&
    !message.isFailed &&
    !message.isQueued &&
    !message.isPending &&
    !message.hasAIResponse

  const showMarkdownContent = isAIMessage
  const hasStreamingContent = isStreaming && !!message.content.trim()
  const canCopy = !!message.content.trim()

  const handleCopyMessage = useCallback(async () => {
    if (!canCopy) return

    try {
      await navigator.clipboard.writeText(message.content)
      setIsCopied(true)
      toast('Message copied')
      setTimeout(() => setIsCopied(false), 1200)
    } catch (error) {
      console.error('Failed to copy message:', error)
      toast.error('Failed to copy message')
    }
  }, [canCopy, message.content])

  const getMessageBody = (): React.ReactNode => {
    switch (true) {
      case isStreaming && !hasStreamingContent:
        return <StreamingIndicator />
      case showMarkdownContent:
        return <MarkdownMessageContent content={message.content} />
      default:
        return message.content
    }
  }

  const bubbleContent = (
    <div
      className={cn(
        'group py-3 px-4 rounded-2xl text-sm sm:text-base w-fit break-words shadow-sm transition-all duration-200 hover:shadow-md relative',
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
        className={cn('leading-relaxed', {
          'whitespace-pre-wrap': !showMarkdownContent
        })}
        role="text"
        aria-live={isStreaming ? 'polite' : undefined}
      >
        {getMessageBody()}
      </div>

      {canCopy && (
        <button
          type="button"
          onClick={handleCopyMessage}
          className="absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background/90 text-muted-foreground shadow-sm opacity-0 transition-opacity duration-150 hover:text-foreground group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Copy message"
          title="Copy message"
        >
          {isCopied ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      )}
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
