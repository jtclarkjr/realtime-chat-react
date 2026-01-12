'use client'

import { useRouter } from 'next/navigation'
import { RealtimeChat } from '@/components/realtime-chat'
import { Button } from '@/components/ui/button'
import { PageTransition } from '@/components/page-transition'
import { RealtimePresenceAvatars } from '@/components/presence'
import { useEffect, useState, useCallback } from 'react'
import type { DatabaseRoom, ChatMessageWithDB } from '@/lib/types/database'
import type { PresenceState } from '@/lib/types/presence'
import type { User } from '@supabase/supabase-js'

interface RoomClientProps {
  room: DatabaseRoom
  initialMessages: ChatMessageWithDB[]
  user: User
}

export function RoomClient({ room, initialMessages, user }: RoomClientProps) {
  const router = useRouter()
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [isLeaving, setIsLeaving] = useState<boolean>(false)
  const [presenceUsers, setPresenceUsers] = useState<PresenceState>({})

  // Use the authenticated user's ID instead of generating a new one
  const userId = user.id

  // Get display name with same fallback logic as server (matches get_user_display_name function)
  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    'Anonymous User'

  // Handle presence changes
  const handlePresenceChange = useCallback((users: PresenceState) => {
    setPresenceUsers(users)
  }, [])

  // Mark as initialized immediately since we have the user from server
  useEffect(() => {
    const initializeTimer = setTimeout(() => {
      setIsInitialized(true)
    }, 0)
    return () => clearTimeout(initializeTimer)
  }, [])

  const handleLeaveRoom = async () => {
    setIsLeaving(true)
    // Brief delay to show button state change
    router.push('/')
  }

  // Prefetch home page on component mount for faster navigation
  useEffect(() => {
    router.prefetch('/')
  }, [router])

  // Ensure proper initialization before showing chat
  if (!isInitialized || !userId) {
    return (
      <PageTransition className="h-dvh flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading room...</div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition className="h-dvh flex flex-col bg-background">
      <header className="border-b border-border p-3 sm:p-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="w-16 flex items-center justify-start">
            <RealtimePresenceAvatars
              presenceUsers={presenceUsers}
              currentUserId={userId}
              currentUserName={displayName}
              currentUserAvatar={user?.user_metadata?.avatar_url}
            />
          </div>
          <h1 className="text-base sm:text-lg font-semibold flex-1 text-center">
            {room.name}
          </h1>
          <Button
            variant={'ghost'}
            onClick={handleLeaveRoom}
            disabled={isLeaving}
          >
            Leave
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <RealtimeChat
          roomId={room.id}
          username={displayName}
          userId={userId}
          userAvatarUrl={user?.user_metadata?.avatar_url}
          onPresenceChange={handlePresenceChange}
          messages={initialMessages.map((message) => ({
            ...message,
            roomId: message.channelId, // Convert channelId to roomId for consistency
            user: {
              id: message.user.id,
              name: message.user.name,
              avatar_url: message.user.avatar_url
            }
          }))}
        />
      </div>
    </PageTransition>
  )
}
