'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Hash, Loader2, Trash2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/stores/ui-store'
import type { DatabaseRoom } from '@/lib/types/database'

interface RoomListItemProps {
  room: DatabaseRoom
  isActive: boolean
  collapsed: boolean
  canDelete?: boolean
  isDeleting?: boolean
  onDelete?: () => void
  onNavigate?: () => void
}

export function RoomListItem({
  room,
  isActive,
  collapsed,
  canDelete = false,
  isDeleting = false,
  onDelete,
  onNavigate
}: RoomListItemProps) {
  const router = useRouter()
  const { unreadCounts } = useUIStore()
  const unreadCount = unreadCounts[room.id] || 0

  const handleMouseEnter = () => {
    // Prefetch the room page on hover
    router.prefetch(`/room/${room.id}`)
  }

  const handleClick = () => {
    // Call onNavigate callback (for mobile drawer)
    onNavigate?.()
  }

  const linkContent = (
    <>
      {/* Hash icon */}
      <Hash
        className={cn(
          'shrink-0 text-muted-foreground',
          isActive && 'text-primary',
          collapsed ? 'h-5 w-5' : 'h-4 w-4'
        )}
      />

      {/* Room name */}
      {!collapsed && (
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span
            className={cn(
              'truncate text-sm font-medium',
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {room.name}
          </span>
        </div>
      )}

      {/* Unread badge */}
      {!collapsed && unreadCount > 0 && (
        <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium shrink-0">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      {/* Unread indicator for collapsed state */}
      {collapsed && unreadCount > 0 && (
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
      )}
    </>
  )

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={`/room/${room.id}`}
              onMouseEnter={handleMouseEnter}
              onClick={handleClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative group',
                'hover:bg-muted/50',
                isActive && 'bg-accent border-l-4 border-primary pl-2',
                'justify-center px-2'
              )}
              aria-label={`${room.name} channel${unreadCount > 0 ? `, ${unreadCount} unread messages` : ''}`}
              aria-current={isActive ? 'page' : undefined}
              role="listitem"
            >
              {linkContent}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{room.name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="flex items-center gap-1 group">
      <Link
        href={`/room/${room.id}`}
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
        className={cn(
          'flex-1 flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative',
          'hover:bg-muted/50',
          isActive && 'bg-accent border-l-4 border-primary pl-2'
        )}
        aria-label={`${room.name} channel${unreadCount > 0 ? `, ${unreadCount} unread messages` : ''}`}
        aria-current={isActive ? 'page' : undefined}
        role="listitem"
      >
        {linkContent}
      </Link>

      {canDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          onClick={onDelete}
          disabled={isDeleting}
          aria-label={`Delete ${room.name} channel`}
          title={`Delete ${room.name}`}
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          )}
        </Button>
      )}
    </div>
  )
}
