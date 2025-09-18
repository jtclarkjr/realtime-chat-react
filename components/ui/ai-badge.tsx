'use client'

import { cn } from '@/lib/utils'
import { Bot, Eye, EyeOff } from 'lucide-react'

interface AIBadgeProps {
  isActive: boolean
  onToggle: () => void
  isPrivate: boolean
  onPrivacyToggle: () => void
  className?: string
}

export const AIBadge = ({
  isActive,
  onToggle,
  isPrivate,
  onPrivacyToggle,
  className
}: AIBadgeProps) => {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* AI Toggle Button */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full transition-all duration-200 border',
          'hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
          isActive
            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
        )}
        aria-label={isActive ? 'Disable AI assistant' : 'Enable AI assistant'}
      >
        <Bot
          className={cn(
            'h-3 w-3 transition-transform duration-200',
            isActive && 'scale-110'
          )}
        />
        <span>AI</span>
      </button>

      {/* Privacy Toggle Button - only show when AI is active */}
      {isActive && (
        <button
          type="button"
          onClick={onPrivacyToggle}
          className={cn(
            'inline-flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 border',
            'hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
            isPrivate
              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 border-orange-200 dark:border-orange-800'
              : 'bg-green-100 dark:bg-green-900/30 text-green-600 border-green-200 dark:border-green-800'
          )}
          aria-label={
            isPrivate ? 'Make AI responses public' : 'Make AI responses private'
          }
          title={
            isPrivate
              ? 'Private: Only you see AI responses'
              : 'Public: Everyone sees AI responses'
          }
        >
          {isPrivate ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  )
}
