import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/hooks/use-realtime-chat'

interface ChatMessageItemProps {
  message: ChatMessage
  isOwnMessage: boolean
  showHeader: boolean
}

export const ChatMessageItem = ({
  message,
  isOwnMessage,
  showHeader
}: ChatMessageItemProps) => {
  return (
    <div
      className={`flex mb-3 sm:mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
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
            <span
              className={cn('font-medium text-xs sm:text-sm', {
                'text-primary': isOwnMessage,
                'text-muted-foreground': !isOwnMessage
              })}
            >
              {message.user.name}
            </span>
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
            isOwnMessage
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md border border-border/50'
          )}
        >
          <div className="whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
        </div>
      </div>
    </div>
  )
}
