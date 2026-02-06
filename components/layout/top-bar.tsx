'use client'

import { Button } from '@/components/ui/button'
import { Menu, Hash } from 'lucide-react'
import { useUIStore } from '@/lib/stores/ui-store'
import { useRooms } from '@/lib/query/queries/use-rooms'
import { PresenceAvatars } from './presence-avatars'
import { useParams } from 'next/navigation'
import type { PublicUser } from '@/lib/types/user'
import type { DatabaseRoom } from '@/lib/types/database'

interface TopBarProps {
  user: PublicUser
  initialRooms: DatabaseRoom[]
}

export function TopBar({ user, initialRooms }: TopBarProps) {
  const params = useParams()
  const { setMobileDrawerOpen, roomPresenceUsers } = useUIStore()
  const { data: rooms = [] } = useRooms({ initialData: initialRooms })

  // Get current room if we're in a room
  const currentRoomId = params?.id as string | undefined
  const currentRoom = currentRoomId
    ? rooms.find((r) => r.id === currentRoomId)
    : null
  const presenceUsers = currentRoomId
    ? roomPresenceUsers[currentRoomId] || {}
    : {}

  if (!currentRoom) {
    return null
  }

  return (
    <header className="border-b border-border bg-background">
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        {/* Left side - Mobile menu or Room info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={() => setMobileDrawerOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>

          <div className="flex items-center gap-3 min-w-0">
            <Hash className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex flex-col min-w-0">
              <h1 className="font-semibold text-base truncate">
                {currentRoom.name}
              </h1>
              {currentRoom.description && (
                <p className="text-xs text-muted-foreground truncate hidden sm:block">
                  {currentRoom.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Presence and notifications */}
        <div className="flex items-center gap-2">
          {Object.keys(presenceUsers).length > 0 && (
            <div className="shrink-0">
              <PresenceAvatars
                presenceUsers={presenceUsers}
                currentUserId={user.id}
                maxVisible={5}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
