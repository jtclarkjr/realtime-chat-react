'use client'

import { useRouter } from 'next/navigation'
import { RealtimeChat } from '@/components/realtime-chat'
import { RoomSkeleton } from '@/components/skeletons'
import { useEffect, useCallback } from 'react'
import { useUIStore } from '@/lib/stores/ui-store'
import type { DatabaseRoom, ChatMessageWithDB } from '@/lib/types/database'
import type { PresenceState } from '@/lib/types/presence'
import type { PublicUser } from '@/lib/types/user'

interface RoomClientProps {
  room: DatabaseRoom
  initialMessages: ChatMessageWithDB[]
  user: PublicUser
}

export function RoomClient({ room, initialMessages, user }: RoomClientProps) {
  const router = useRouter()
  const { addRecentRoom, markAsRead, setRoomPresence, setRoomPresenceUsers } =
    useUIStore()

  const userId = user.id
  const displayName = user.username

  // Handle presence changes
  const handlePresenceChange = useCallback(
    (users: PresenceState) => {
      // Update presence count in UI store for room list
      const onlineCount = Object.keys(users).length
      setRoomPresence(room.id, onlineCount)
      // Update full presence users for avatar display
      setRoomPresenceUsers(room.id, users)
    },
    [room.id, setRoomPresence, setRoomPresenceUsers]
  )

  // Track this room as recently visited and clear unread count
  useEffect(() => {
    if (room?.id) {
      addRecentRoom(room.id)
      markAsRead(room.id)
    }
  }, [room?.id, addRecentRoom, markAsRead])

  // Prefetch dashboard on mount
  useEffect(() => {
    router.prefetch('/')
  }, [router])

  if (!userId) {
    return <RoomSkeleton />
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <RealtimeChat
        roomId={room.id}
        username={displayName}
        userId={userId}
        userAvatarUrl={user.avatarUrl}
        onPresenceChange={handlePresenceChange}
        isAnonymous={user.isAnonymous}
        messages={initialMessages.map((message) => ({
          ...message,
          roomId: message.channelId,
          user: {
            id: message.user.id,
            name: message.user.name,
            avatar_url: message.user.avatar_url
          }
        }))}
      />
    </div>
  )
}
