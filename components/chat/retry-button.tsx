'use client'

import { cn } from '@/lib/utils'
import { RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RetryButtonProps {
  messageId: string
  isRetrying: boolean
  onRetry: (messageId: string) => void
}

export const RetryButton = ({
  messageId,
  isRetrying,
  onRetry
}: RetryButtonProps) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'h-8 w-8 p-0 rounded-full bg-background border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0',
        isRetrying && 'pointer-events-none opacity-50'
      )}
      onClick={() => onRetry(messageId)}
      disabled={isRetrying}
      title={isRetrying ? 'Retrying...' : 'Retry sending message'}
    >
      {isRetrying ? (
        <Loader2 className="h-4 w-4 animate-spin text-red-600" />
      ) : (
        <RotateCcw className="h-4 w-4 text-red-600" />
      )}
    </Button>
  )
}