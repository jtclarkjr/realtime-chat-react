'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Hash, ArrowRight } from 'lucide-react'
import { useUIStore } from '@/lib/stores/ui-store'
import { useRooms } from '@/lib/query/queries/use-rooms'
import type { DatabaseRoom } from '@/lib/types/database'

interface RecentRoomsProps {
  initialRooms: DatabaseRoom[]
}

export function RecentRooms({ initialRooms }: RecentRoomsProps) {
  const router = useRouter()
  const { recentRooms } = useUIStore()

  const { data: rooms = [] } = useRooms({
    initialData: initialRooms.length > 0 ? initialRooms : undefined
  })

  // Get the actual room objects for recent room IDs
  const recentRoomObjects = recentRooms
    .map((roomId) => rooms.find((r) => r.id === roomId))
    .filter((room): room is DatabaseRoom => room !== undefined)
    .slice(0, 5) // Show max 5 recent rooms

  if (recentRoomObjects.length === 0) {
    return null
  }

  const handleMouseEnter = (roomId: string) => {
    router.prefetch(`/room/${roomId}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-semibold">Jump back in</h2>
      <div className="space-y-2">
        {recentRoomObjects.map((room) => (
          <Link
            key={room.id}
            href={`/room/${room.id}`}
            onMouseEnter={() => handleMouseEnter(room.id)}
            className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors group"
          >
            <div className="p-2 bg-muted rounded-lg">
              <Hash className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{room.name}</div>
              {room.description && (
                <div className="text-sm text-muted-foreground truncate">
                  {room.description}
                </div>
              )}
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  )
}
