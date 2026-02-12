'use client'

import { cn } from '@/lib/utils'

interface FailedMessageBubbleProps {
  content: string
}

export const FailedMessageBubble = ({ content }: FailedMessageBubbleProps) => {
  return (
    <div
      className={cn(
        'py-3 px-4 rounded-2xl text-sm sm:text-base max-w-full w-fit break-words [overflow-wrap:anywhere] [word-break:break-word] shadow-sm transition-all duration-200 hover:shadow-md',
        'bg-red-100 dark:bg-red-900/30 text-foreground rounded-br-md border border-red-300 dark:border-red-700 opacity-75'
      )}
    >
      <div
        className="whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word]"
        role="text"
      >
        {content}
      </div>
    </div>
  )
}
