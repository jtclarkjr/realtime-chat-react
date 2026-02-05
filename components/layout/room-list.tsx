'use client'

import { RoomListItem } from './room-list-item'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddRoomDialog } from '@/components/add-room-dialog'
import { useRooms } from '@/lib/query/queries/use-rooms'
import { useState } from 'react'
import type { DatabaseRoom } from '@/lib/types/database'
import type { PublicUser } from '@/lib/types/user'

interface RoomListProps {
  activeRoomId: string | null
  collapsed: boolean
  initialRooms: DatabaseRoom[]
  user: PublicUser
  onNavigate?: () => void
}

export function RoomList({
  activeRoomId,
  collapsed,
  initialRooms,
  user,
  onNavigate
}: RoomListProps) {
  const [showAddRoom, setShowAddRoom] = useState(false)

  const { data: rooms = [], isLoading } = useRooms({
    initialData: initialRooms.length > 0 ? initialRooms : undefined,
    enabled: initialRooms.length === 0
  })

  const handleRoomCreated = async (): Promise<void> => {
    // Room will be automatically added to the list via React Query
    setShowAddRoom(false)
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-3">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Hide the header in collapsed anonymous mode since there are no actions */}
      {!(collapsed && user.isAnonymous) && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          {!collapsed && (
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Channels
            </h2>
          )}
          {!user.isAnonymous && (
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-6 w-6', collapsed && 'mx-auto')}
              onClick={() => setShowAddRoom(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add room</span>
            </Button>
          )}
        </div>
      )}

      {/* Room list */}
      <div
        className="flex-1 overflow-y-auto p-2 space-y-1"
        role="list"
        aria-label="Channel list"
      >
        {rooms.map((room) => (
          <RoomListItem
            key={room.id}
            room={room}
            isActive={room.id === activeRoomId}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {/* Add room dialog */}
      <AddRoomDialog
        open={showAddRoom}
        onOpenChange={setShowAddRoom}
        onRoomCreated={handleRoomCreated}
        disabled={false}
        existingRooms={rooms}
      />
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
