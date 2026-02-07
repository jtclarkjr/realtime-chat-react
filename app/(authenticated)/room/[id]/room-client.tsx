'use client'

import { useRouter } from 'next/navigation'
import { RealtimeChat } from '@/components/realtime-chat'
import { RoomSkeleton } from '@/components/skeletons'
import { useEffect, useCallback } from 'react'
import { useUIStore } from '@/lib/stores/ui-store'
import type { DatabaseRoom, ChatMessageWithDB } from '@/lib/types/database'
import type { PresenceState } from '@/lib/types/presence'
import type { PublicUser } from '@/lib/types/user'
import { useRoomById } from '@/lib/query/queries'

interface RoomClientProps {
  roomId: string
  initialRoom: DatabaseRoom
  initialMessages: ChatMessageWithDB[]
  user: PublicUser
}

export function RoomClient({
  roomId,
  initialRoom,
  initialMessages,
  user
}: RoomClientProps) {
  const router = useRouter()
  const { addRecentRoom, markAsRead, setRoomPresence, setRoomPresenceUsers } =
    useUIStore()
  const { data: room } = useRoomById({
    roomId,
    initialData: initialRoom
  })
  const activeRoomId = room?.id ?? roomId

  const userId = user.id
  const displayName = user.username

  // Handle presence changes
  const handlePresenceChange = useCallback(
    (users: PresenceState) => {
      // Update presence count in UI store for room list
      const onlineCount = Object.keys(users).length
      setRoomPresence(activeRoomId, onlineCount)
      // Update full presence users for avatar display
      setRoomPresenceUsers(activeRoomId, users)
    },
    [activeRoomId, setRoomPresence, setRoomPresenceUsers]
  )

  // Track this room as recently visited and clear unread count
  useEffect(() => {
    if (activeRoomId) {
      addRecentRoom(activeRoomId)
      markAsRead(activeRoomId)
    }
  }, [activeRoomId, addRecentRoom, markAsRead])

  // Prefetch dashboard on mount
  useEffect(() => {
    router.prefetch('/')
  }, [router])

  if (!userId || !room) {
    return <RoomSkeleton />
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <RealtimeChat
        roomId={activeRoomId}
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
