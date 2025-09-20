'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { RoomSelector } from '@/components/room-selector'
import { PageTransition } from '@/components/page-transition'
import { LoadingTransition } from '@/components/loading-transition'
import { useUserStore } from '@/lib/stores/user-store'
import { useRoomStore } from '@/lib/stores/room-store'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { signOut } from '@/lib/auth/client'
import { useRouter } from 'next/navigation'
import type { DatabaseRoom } from '@/lib/types/database'

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
  const [isNavigating, setIsNavigating] = useState(false)

  const { userId } = useUserStore()
  const { selectedRoomId, setSelectedRoomId } = useRoomStore()

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
      // Prefetch the default room for faster navigation
      router.prefetch(`/room/${initialDefaultRoomId}`)
    }
  }, [selectedRoomId, initialDefaultRoomId, router, setSelectedRoomId])

  const handleJoinChat = async () => {
    if (user && selectedRoomId && userId) {
      setIsNavigating(true)
      router.push(`/room/${selectedRoomId}`)
    }
  }

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId)
    router.prefetch(`/room/${roomId}`)
  }

  const handleLogout = async () => {
    router.push('/login')
    signOut().catch((error) => {
      console.error('Error signing out:', error)
    })
  }

  // Don't render until we have auth state
  if (authLoading) {
    return <LoadingTransition message="Loading..." />
  }

  // If no user or userId, let redirect effect handle it without showing loader
  if (!user || !userId) {
    return null
  }

  // Show navigating state
  if (isNavigating) {
    return <LoadingTransition message="Entering room..." />
  }

  return (
    <PageTransition className="min-h-dvh flex items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
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
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3 flex-1">
                  {user.user_metadata?.avatar_url && (
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full"
                      priority
                    />
                  )}
                  <div>
                    <div className="font-medium">
                      {user.user_metadata?.full_name || 'Anonymous User'}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="text-danger"
                  className="ml-4"
                >
                  Sign Out
                </Button>
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
              disabled={isNavigating}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 px-4 rounded-lg font-medium text-base transition-all duration-200 active:scale-95 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isNavigating ? 'Joining...' : 'Join Chat'}
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
