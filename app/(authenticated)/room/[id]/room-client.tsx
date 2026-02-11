'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RealtimeChat } from '@/components/realtime-chat'
import { RoomSkeleton } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { useEffect, useCallback } from 'react'
import { useUIStore } from '@/lib/stores/ui-store'
import type { PresenceState } from '@/lib/types/presence'
import { useRoomById } from '@/lib/query/queries'
import { useAuthenticatedUser } from '@/hooks/use-authenticated-user'

interface RoomClientProps {
  roomId: string
}

export function RoomClient({ roomId }: RoomClientProps) {
  const router = useRouter()
  const user = useAuthenticatedUser()
  const { addRecentRoom, markAsRead, setRoomPresence, setRoomPresenceUsers } =
    useUIStore()
  const {
    data: room,
    isLoading,
    isFetching,
    isError
  } = useRoomById({
    roomId,
    enabled: !!roomId
  })
  const activeRoomId = room?.id ?? roomId

  const userId = user.id
  const displayName = user.username

  const handlePresenceChange = useCallback(
    (users: PresenceState) => {
      const onlineCount = Object.keys(users).length
      setRoomPresence(activeRoomId, onlineCount)
      setRoomPresenceUsers(activeRoomId, users)
    },
    [activeRoomId, setRoomPresence, setRoomPresenceUsers]
  )

  useEffect(() => {
    if (activeRoomId) {
      addRecentRoom(activeRoomId)
      markAsRead(activeRoomId)
    }
  }, [activeRoomId, addRecentRoom, markAsRead])

  useEffect(() => {
    router.prefetch('/')
  }, [router])

  if (isError) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Room Not Found</h1>
          <p className="text-muted-foreground">
            The room you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <Button asChild>
            <Link href="/">Go Back to Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!userId || !room || (isLoading && !room) || (isFetching && !room)) {
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
      />
    </div>
  )
}
