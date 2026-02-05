'use client'

import { useRouter } from 'next/navigation'
import { RealtimeChat } from '@/components/realtime-chat'
import { useEffect, useState, useCallback } from 'react'
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
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const { addRecentRoom, clearUnread, setRoomPresence, setRoomPresenceUsers } =
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
      clearUnread(room.id)
    }
  }, [room?.id, addRecentRoom, clearUnread])

  // Mark as initialized immediately
  useEffect(() => {
    const initializeTimer = setTimeout(() => {
      setIsInitialized(true)
    }, 0)
    return () => clearTimeout(initializeTimer)
  }, [])

  // Prefetch dashboard on mount
  useEffect(() => {
    router.prefetch('/')
  }, [router])

  // Show loading only if not initialized
  if (!isInitialized || !userId) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading room...</div>
        </div>
      </div>
    )
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
