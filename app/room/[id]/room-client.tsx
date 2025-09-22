'use client'

import { useRouter } from 'next/navigation'
import { RealtimeChat } from '@/components/realtime-chat'
import { Button } from '@/components/ui/button'
import { PageTransition } from '@/components/page-transition'
import { useEffect, useState } from 'react'
import type { DatabaseRoom, ChatMessageWithDB } from '@/lib/types/database'
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

  // Use the authenticated user's ID instead of generating a new one
  const userId = user.id

  // Mark as initialized immediately since we have the user from server
  useEffect(() => {
    setIsInitialized(true)
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
          <div className="w-16"></div>
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
          username={user?.user_metadata?.full_name || 'Anonymous User'}
          userId={userId}
          messages={initialMessages.map((message) => ({
            ...message,
            roomId: message.channelId, // Convert channelId to roomId for consistency
            user: {
              id: message.user.id,
              name: message.user.name
            }
          }))}
        />
      </div>
    </PageTransition>
  )
}
