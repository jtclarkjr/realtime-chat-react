'use client'

import { Loader2, Clock } from 'lucide-react'
import type { ChatMessage } from '@/lib/types/database'

interface MessageStatusIndicatorProps {
  message: ChatMessage
}

export const MessageStatusIndicator = ({
  message
}: MessageStatusIndicatorProps) => {
  if (!message.isQueued && !message.isPending && !message.isRetrying) {
    return null
  }

  const getStatusTitle = (message: ChatMessage): string => {
    if (message.isRetrying || message.isPending) return 'Sending...'
    if (message.isQueued)
      return 'Queued for sending when connection is restored'
    return ''
  }

  return (
    <div
      className="flex items-center justify-center w-6 h-6 rounded-full bg-background border border-border shadow-sm"
      title={getStatusTitle(message)}
    >
      {message.isRetrying || message.isPending ? (
        <Loader2 className="h-3 w-3 animate-spin text-yellow-600" />
      ) : message.isQueued ? (
        <Clock className="h-3 w-3 text-yellow-600" />
      ) : null}
    </div>
  )
}
