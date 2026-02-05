'use client'

import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Hash } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/lib/stores/ui-store'
import { useRooms } from '@/lib/query/queries/use-rooms'
import type { DatabaseRoom } from '@/lib/types/database'

interface NotificationDropdownProps {
  initialRooms: DatabaseRoom[]
  children: React.ReactNode
}

export function NotificationDropdown({
  initialRooms,
  children
}: NotificationDropdownProps) {
  const router = useRouter()
  const { unreadCounts, clearUnread } = useUIStore()

  const { data: rooms = [] } = useRooms({
    initialData: initialRooms.length > 0 ? initialRooms : undefined
  })

  // Get rooms with unread messages
  const unreadRooms = rooms
    .filter((room) => (unreadCounts[room.id] || 0) > 0)
    .sort((a, b) => (unreadCounts[b.id] || 0) - (unreadCounts[a.id] || 0))

  const handleRoomClick = (roomId: string) => {
    clearUnread(roomId)
    router.push(`/room/${roomId}`)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Notifications</h3>
          {unreadRooms.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {unreadRooms.length} channel{unreadRooms.length !== 1 ? 's' : ''}{' '}
              with unread messages
            </p>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {unreadRooms.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <p>No new notifications</p>
              <p className="text-xs mt-2">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="py-2">
              {unreadRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleRoomClick(room.id)}
                  className="w-full px-4 py-3 hover:bg-muted/50 transition-colors text-left flex items-center gap-3"
                >
                  <div className="p-2 bg-muted rounded-lg">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{room.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {unreadCounts[room.id]} new message
                      {unreadCounts[room.id] !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="h-6 min-w-6 px-2 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium shrink-0">
                    {unreadCounts[room.id] > 99 ? '99+' : unreadCounts[room.id]}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
