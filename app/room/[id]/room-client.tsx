'use client'

import { RealtimeChat } from '@/components/realtime-chat'
import { Button } from '@/components/ui/button'
import { PageTransition } from '@/components/page-transition'
import { useEffect, useState } from 'react'
import { DatabaseRoom, ChatMessageWithDB } from '@/lib/types/database'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

interface RoomClientProps {
  room: DatabaseRoom
  initialMessages: ChatMessageWithDB[]
  user: User
}

export function RoomClient({ room, initialMessages, user }: RoomClientProps) {
  const router = useRouter()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  // Use the authenticated user's ID instead of generating a new one
  const userId = user.id

  // Mark as initialized immediately since we have the user from server
  useEffect(() => {
    setIsInitialized(true)
  }, [])

  const handleLeaveRoom = async () => {
    setIsLeaving(true)
    // Brief delay to show button state change
    await new Promise((resolve) => setTimeout(resolve, 150))
    router.push('/')
  }

  // Prefetch home page on component mount for faster navigation
  useEffect(() => {
    router.prefetch('/')
  }, [router])

  // Simple initialization check - no store dependency
  if (!isInitialized || !userId) {
    return null // Very brief, almost invisible
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
            onClick={handleLeaveRoom}
            disabled={isLeaving}
            className="text-xs sm:text-sm text-gray-800 bg-white hover:text-white hover:bg-gray-700 transition-all duration-200 px-2 py-1 rounded border border-gray-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLeaving ? 'Leaving...' : 'Leave'}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <RealtimeChat
          roomId={room.id}
          username={user?.user_metadata?.full_name || 'Anonymous User'}
          userId={userId}
          messages={initialMessages}
        />
      </div>
    </PageTransition>
  )
}
