'use client'

import { cn } from '@/lib/utils'
import { Bot, EyeOff } from 'lucide-react'
import type { ChatMessage } from '@/lib/types/database'

interface MessageHeaderProps {
  message: ChatMessage
  isOwnMessage: boolean
  isAIMessage: boolean
  isPrivateForCurrentUser: boolean
}

export const MessageHeader = ({
  message,
  isOwnMessage,
  isAIMessage,
  isPrivateForCurrentUser
}: MessageHeaderProps) => {
  return (
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
  )
}