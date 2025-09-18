import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/lib/types/database'
import { Bot, EyeOff } from 'lucide-react'

interface ChatMessageItemProps {
  message: ChatMessage
  isOwnMessage: boolean
  showHeader: boolean
  currentUserId?: string
}

export const ChatMessageItem = ({
  message,
  isOwnMessage,
  showHeader,
  currentUserId
}: ChatMessageItemProps) => {
  const isAIMessage = message.isAI || message.user.name === 'AI Assistant'
  const isStreaming =
    isAIMessage && (message.isStreaming || !message.content.trim()) // AI message with no content or marked as streaming
  const isPrivateMessage = message.isPrivate && isAIMessage
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
    <div className={`flex mb-3 sm:mb-4 ${getMessageAlignment()}`}>
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
              {isAIMessage && <Bot className="h-3 w-3 text-blue-500" />}
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
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                  title="Private AI response - only visible to you"
                >
                  <EyeOff className="h-2.5 w-2.5" />
                  <span className="text-xs font-medium">Private</span>
                </div>
              )}
            </div>
            <span className="text-foreground/50 text-xs">
              {new Date(message.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>
        )}
        <div
          className={cn(
            'py-3 px-4 rounded-2xl text-sm sm:text-base w-fit break-words shadow-sm transition-all duration-200 hover:shadow-md',
            {
              'bg-primary text-primary-foreground rounded-br-md': isOwnMessage,
              'bg-orange-50 dark:bg-orange-950/30 text-foreground rounded-bl-md border border-orange-200 dark:border-orange-800/50':
                isPrivateForCurrentUser,
              'bg-blue-50 dark:bg-blue-950/30 text-foreground rounded-bl-md border border-blue-200 dark:border-blue-800/50':
                isAIMessage && !isOwnMessage && !isPrivateForCurrentUser,
              'bg-muted text-foreground rounded-bl-md border border-border/50':
                !isOwnMessage && !isAIMessage
            }
          )}
        >
          <div className="whitespace-pre-wrap leading-relaxed">
            {isStreaming ? (
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
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
      </div>
    </div>
  )
}
