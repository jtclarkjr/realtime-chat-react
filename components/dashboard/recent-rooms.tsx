'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Hash, ArrowRight, Bot } from 'lucide-react'
import { useUIStore } from '@/lib/stores/ui-store'
import { formatRelativeTime } from '@/lib/utils/format-time'
import type { RoomWithLastMessage } from '@/lib/actions/room-actions'

interface RecentRoomsProps {
  initialRooms: RoomWithLastMessage[]
}

export function RecentRooms({ initialRooms }: RecentRoomsProps) {
  const router = useRouter()
  const { recentRooms } = useUIStore()

  // Sort rooms by:
  // 1. Recent rooms (from UI store) come first, in order of recency
  // 2. Then remaining rooms sorted by last message timestamp
  const sortedRooms = [...initialRooms].sort((a, b) => {
    const aRecentIndex = recentRooms.indexOf(a.id)
    const bRecentIndex = recentRooms.indexOf(b.id)

    // If both are in recent rooms, sort by recency (lower index = more recent)
    if (aRecentIndex !== -1 && bRecentIndex !== -1) {
      return aRecentIndex - bRecentIndex
    }

    // If only one is in recent rooms, it comes first
    if (aRecentIndex !== -1) return -1
    if (bRecentIndex !== -1) return 1

    // For non-recent rooms, sort by last message timestamp
    if (a.lastMessage && b.lastMessage) {
      return (
        new Date(b.lastMessage.timestamp).getTime() -
        new Date(a.lastMessage.timestamp).getTime()
      )
    }
    if (a.lastMessage) return -1
    if (b.lastMessage) return 1

    // If no last messages, sort alphabetically
    return a.name.localeCompare(b.name)
  })

  // Show top 5 rooms
  const displayedRooms = sortedRooms.slice(0, 5)

  if (displayedRooms.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h2 className="text-xl font-semibold">Recent chats</h2>
        <div className="text-center py-8 text-muted-foreground">
          <p>No recent chats yet.</p>
          <p className="text-sm mt-2">Start a conversation in a room to see it here!</p>
        </div>
      </div>
    )
  }

  const handleMouseEnter = (roomId: string) => {
    router.prefetch(`/room/${roomId}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-semibold">Recent chats</h2>
      <div className="space-y-2">
        {displayedRooms.map((room) => (
          <Link
            key={room.id}
            href={`/room/${room.id}`}
            onMouseEnter={() => handleMouseEnter(room.id)}
            className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors group"
          >
            <div className="p-2 bg-muted rounded-lg shrink-0">
              <Hash className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium mb-1">{room.name}</div>
              {room.lastMessage ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {room.lastMessage.isAI && (
                    <Bot className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">
                    {room.lastMessage.userName}: {room.lastMessage.content}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No messages yet
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {room.lastMessage && (
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(room.lastMessage.timestamp)}
                </span>
              )}
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
