'use client'

import { Button } from '@/components/ui/button'
import { RoomSelector } from '@/components/room-selector'
import { useUserStore, useInitializeUser } from '@/lib/stores/user-store'
import { useState, useEffect } from 'react'
import { DatabaseRoom } from '@/lib/types/database'
import { useAuth } from '@/lib/auth/context'
import { signOut } from '@/lib/auth/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface HomeClientProps {
  initialRooms: DatabaseRoom[]
  initialDefaultRoomId: string | null
}

export function HomeClient({
  initialRooms,
  initialDefaultRoomId
}: HomeClientProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const { userId } = useUserStore()

  // Local state for selected room - not persisted
  const [selectedRoomId, setSelectedRoomId] = useState(
    initialDefaultRoomId || ''
  )

  // Initialize userId
  useInitializeUser()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Set default selected room if none is selected and we have initial rooms
  useEffect(() => {
    if (!selectedRoomId && initialDefaultRoomId) {
      setSelectedRoomId(initialDefaultRoomId)
    }
  }, [selectedRoomId, initialDefaultRoomId])

  const handleJoinChat = async () => {
    if (user && selectedRoomId && userId) {
      // Navigate to the room route instead of joining inline
      router.push(`/room/${selectedRoomId}`)
    }
  }

  const handleRoomChange = (roomId: string) => {
    // Update local selected room state
    setSelectedRoomId(roomId)
  }

  const handleLogout = async () => {
    const { error } = await signOut()
    if (error) {
      console.error('Error signing out:', error)
    } else {
      router.push('/login')
    }
  }

  // Don't render until we have auth state and userId
  if (authLoading || !userId || !user) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-muted-foreground">
            {authLoading ? 'Loading...' : 'Initializing...'}
          </div>
        </div>
      </div>
    )
  }

  // Always show the room selection interface since we're routing to separate room pages
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Realtime Chat</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Choose a room to join the chat
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Signed in as</label>
            <div className="w-full px-4 py-3 text-base border border-border rounded-lg bg-muted/50 text-foreground">
              <div className="flex items-center gap-3">
                {user.user_metadata?.avatar_url && (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div>
                  <div className="font-medium">
                    {user.user_metadata?.full_name || 'Anonymous User'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Room</label>
            <div className="w-full">
              <RoomSelector
                selectedRoom={selectedRoomId}
                onRoomChange={handleRoomChange}
                disabled={false}
                initialRooms={initialRooms}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleJoinChat}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 py-3 px-4 rounded-lg font-medium text-base transition-colors duration-200 active:scale-95"
            >
              Join Chat
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="px-4 py-3 rounded-lg font-medium text-base transition-colors duration-200"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
