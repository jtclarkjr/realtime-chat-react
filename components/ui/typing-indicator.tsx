'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Bot } from 'lucide-react'

interface TypingIndicatorProps {
  className?: string
  message?: string
}

export const TypingIndicator = ({
  className,
  message = 'AI Assistant is typing...'
}: TypingIndicatorProps) => {
  return (
    <div className={cn('flex justify-start mb-3 sm:mb-4', className)}>
      <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[60%] w-fit flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs px-3 mb-1">
          <div className="flex items-center gap-1.5">
            <Bot className="h-3 w-3 text-blue-500" />
            <span className="font-medium text-xs sm:text-sm text-blue-600 dark:text-blue-400">
              AI Assistant
            </span>
          </div>
        </div>
        <div className="py-3 px-4 rounded-2xl text-sm sm:text-base w-fit break-words shadow-sm bg-blue-50 dark:bg-blue-950/30 text-foreground rounded-bl-md border border-blue-200 dark:border-blue-800/50">
          <div className="flex items-center gap-2">
            <div className="flex space-x-1">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground italic">
              {message}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
