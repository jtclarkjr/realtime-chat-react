'use client'

import { RealtimeChat } from '@/components/realtime-chat'
import { Button } from '@/components/ui/button'
import { useInitializeUser } from '@/lib/stores/user-store'
import { useEffect, useState } from 'react'
import { DatabaseRoom, ChatMessageWithDB } from '@/lib/types/database'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth/client'
import { User } from '@supabase/supabase-js'

interface RoomClientProps {
  room: DatabaseRoom
  initialMessages: ChatMessageWithDB[]
  user: User
}

export function RoomClient({ room, initialMessages, user }: RoomClientProps) {
  const router = useRouter()
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Initialize userId - this is synchronous now
  const userId = useInitializeUser()

  // Mark as initialized once we have userId
  useEffect(() => {
    if (userId) {
      setIsInitialized(true)
    }
  }, [userId])

  const handleLeaveRoom = () => {
    router.push('/')
  }

  const handleLogout = async () => {
    const { error } = await signOut()
    if (error) {
      console.error('Error signing out:', error)
    } else {
      router.push('/login')
    }
  }

  // Simple initialization check - no store dependency
  if (!isInitialized || !userId) {
    return null // Very brief, almost invisible
  }

  return (
    <div className="h-dvh flex flex-col bg-background">
      <header className="border-b border-border p-3 sm:p-4 shrink-0">
        <div className="flex items-center justify-between">
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="text-xs sm:text-sm text-muted-foreground hover:text-foreground"
          >
            Sign Out
          </Button>
          <h1 className="text-base sm:text-lg font-semibold flex-1 text-center">
            {room.name}
          </h1>
          <Button
            onClick={handleLeaveRoom}
            className="text-xs sm:text-sm text-gray-800 bg-white hover:text-white hover:bg-gray-700 transition-colors px-2 py-1 rounded border border-gray-200"
          >
            Leave
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <RealtimeChat
          roomId={room.id}
          roomName={room.name}
          username={user?.user_metadata?.full_name || 'Anonymous User'}
          userId={userId}
          messages={initialMessages}
        />
      </div>
    </div>
  )
}
