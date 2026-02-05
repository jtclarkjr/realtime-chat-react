'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/stores/ui-store'
import type { DatabaseRoom } from '@/lib/types/database'

interface RoomListItemProps {
  room: DatabaseRoom
  isActive: boolean
  collapsed: boolean
  onNavigate?: () => void
}

export function RoomListItem({
  room,
  isActive,
  collapsed,
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

  return (
    <Link
      href={`/room/${room.id}`}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative group',
        'hover:bg-muted/50',
        isActive && 'bg-accent border-l-4 border-primary pl-2',
        collapsed && 'justify-center px-2'
      )}
    >
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
        <span
          className={cn(
            'flex-1 truncate text-sm font-medium',
            isActive ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {room.name}
        </span>
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
    </Link>
  )
}
