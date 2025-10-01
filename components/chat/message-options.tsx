'use client'

import { useState, useCallback } from 'react'
import { Trash2, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
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
  const [isHovered, setIsHovered] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const handleUnsend = useCallback(() => {
    onUnsend(messageId)
  }, [messageId, onUnsend])

  const showOptionsButton = isHovered && canUnsend && !isUnsending

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="relative group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {children}

          {/* Desktop Options Button */}
          <div className="hidden md:block">
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 -right-8 w-6 h-6 rounded-full bg-background border border-border shadow-sm hover:bg-muted transition-all duration-200',
                    'flex items-center justify-center cursor-pointer',
                    'opacity-0 group-hover:opacity-100',
                    {
                      'opacity-100': popoverOpen,
                      'opacity-0 pointer-events-none': !showOptionsButton
                    }
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    setPopoverOpen(!popoverOpen)
                  }}
                >
                  <MoreVertical className="w-3 h-3 text-muted-foreground" />
                </button>
              </PopoverTrigger>

              <PopoverContent
                className="w-48 p-1"
                align="start"
                side="left"
                sideOffset={5}
              >
                <button
                  onClick={handleUnsend}
                  disabled={isUnsending}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-3',
                    'focus:outline-none focus:bg-muted',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isUnsending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      <span>Unsending...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 text-red-500" />
                      <span className="text-red-500">Unsend</span>
                    </>
                  )}
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
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
