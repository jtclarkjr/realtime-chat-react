import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/lib/types/database'
import { Bot, EyeOff, RotateCcw, Loader2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatMessageItemProps {
  message: ChatMessage
  isOwnMessage: boolean
  showHeader: boolean
  currentUserId?: string
  onRetry?: (messageId: string) => void
}

export const ChatMessageItem = ({
  message,
  isOwnMessage,
  showHeader,
  currentUserId,
  onRetry
}: ChatMessageItemProps) => {
  const isAIMessage = message.isAI || message.user.name === 'AI Assistant'
  const isStreaming =
    isAIMessage && (message.isStreaming || !message.content.trim()) // AI message with no content or marked as streaming
  const isPrivateMessage = message.isPrivate
  const isPrivateForCurrentUser =
    isPrivateMessage && message.requesterId === currentUserId

  // Don't render private messages that don't belong to current user
  // Private messages should ONLY be visible to the user who requested them
  if (isPrivateMessage && message.requesterId !== currentUserId) {
    return null
  }

  const getMessageAlignment = () => {
    if (isOwnMessage) return 'justify-end'
    return 'justify-start'
  }

  return (
    <div
      className={`flex mb-3 sm:mb-4 ${getMessageAlignment()}`}
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
          <div
            className={cn('flex items-center gap-2 text-xs px-3 mb-1', {
              'justify-end flex-row-reverse': isOwnMessage
            })}
          >
            <div className="flex items-center gap-1.5">
              {isAIMessage && (
                <Bot className="h-3 w-3 text-blue-500" aria-hidden="true" />
              )}
              <span
                className={cn('font-medium text-xs sm:text-sm', {
                  'text-primary': isOwnMessage,
                  'text-blue-600 dark:text-blue-400':
                    isAIMessage && !isOwnMessage,
                  'text-muted-foreground': !isOwnMessage && !isAIMessage
                })}
              >
                {message.user.name}
              </span>
              {isPrivateForCurrentUser && (
                <div
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ${
                    isAIMessage
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      : 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400'
                  }`}
                  title={
                    isAIMessage
                      ? 'Private AI response - only visible to you'
                      : 'Private message - only visible to you'
                  }
                >
                  <EyeOff className="h-2.5 w-2.5" aria-hidden="true" />
                  <span className="text-xs font-medium">Private</span>
                </div>
              )}
            </div>
            <time
              className="text-foreground/50 text-xs"
              dateTime={message.createdAt}
              aria-label={`Sent at ${new Date(
                message.createdAt
              ).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}`}
            >
              {new Date(message.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </time>
          </div>
        )}
        {/* Use flexbox layout only for user's failed messages */}
        {message.isFailed && isOwnMessage && onRetry ? (
          <div className="flex items-center gap-2 flex-row-reverse">
            {/* Retry button for failed messages - positioned on the left */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-8 p-0 rounded-full bg-background border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0',
                message.isRetrying && 'pointer-events-none opacity-50'
              )}
              onClick={() => onRetry(message.id)}
              disabled={message.isRetrying}
              title={message.isRetrying ? 'Retrying...' : 'Retry sending message'}
            >
              {message.isRetrying ? (
                <Loader2 className="h-4 w-4 animate-spin text-red-600" />
              ) : (
                <RotateCcw className="h-4 w-4 text-red-600" />
              )}
            </Button>
            
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'py-3 px-4 rounded-2xl text-sm sm:text-base w-fit break-words shadow-sm transition-all duration-200 hover:shadow-md',
                  'bg-red-100 dark:bg-red-900/30 text-foreground rounded-br-md border border-red-300 dark:border-red-700 opacity-75'
                )}
              >
                <div
                  className="whitespace-pre-wrap leading-relaxed"
                  role="text"
                >
                  {message.content}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Normal message layout for all other messages */
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'py-3 px-4 rounded-2xl text-sm sm:text-base w-fit break-words shadow-sm transition-all duration-200 hover:shadow-md relative',
                {
                  'bg-primary text-primary-foreground rounded-br-md':
                    isOwnMessage && !isPrivateForCurrentUser && !message.isQueued && !message.isPending,
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
              {isStreaming ? (
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1" aria-hidden="true">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"
                        style={{
                          animationDelay: `${i * 0.2}s`,
                          animationDuration: '1s'
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground italic">
                    AI is thinking...
                  </span>
                </div>
              ) : (
                message.content
              )}
            </div>
            </div>
            
            {/* Status indicators for user's own messages */}
            {isOwnMessage && (message.isQueued || message.isPending || message.isRetrying) && (
              <div 
                className="flex items-center justify-center w-6 h-6 rounded-full bg-background border border-border shadow-sm"
                title={
                  message.isRetrying ? 'Sending...' :
                  message.isQueued ? 'Queued for sending when connection is restored' :
                  message.isPending ? 'Sending...' : ''
                }
              >
                {message.isRetrying || message.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin text-yellow-600" />
                ) : message.isQueued ? (
                  <Clock className="h-3 w-3 text-yellow-600" />
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
