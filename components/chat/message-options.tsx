'use client'

import { useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'

interface MessageOptionsProps {
  messageId: string
  onUnsend: (messageId: string) => void
  isUnsending: boolean
  canUnsend: boolean
  children: React.ReactNode
}

export const MessageOptions = ({
  messageId,
  onUnsend,
  isUnsending,
  canUnsend,
  children
}: MessageOptionsProps) => {
  const handleUnsend = useCallback(() => {
    onUnsend(messageId)
  }, [messageId, onUnsend])

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>{children}</div>
      </ContextMenuTrigger>

      {canUnsend && (
        <ContextMenuContent>
          <ContextMenuItem
            variant="destructive"
            disabled={isUnsending}
            onSelect={handleUnsend}
          >
            {isUnsending ? (
              <>
                <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                <span>Unsending...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Unsend</span>
              </>
            )}
          </ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  )
}
