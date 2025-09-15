'use client'

import { RealtimeChat } from '@/components/realtime-chat'
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
  
  const {
    userId,
    roomId: storedRoomId,
    roomName: storedRoomName,
    isJoined,
    joinRoom,
    leaveRoom,
    setRoomId,
    setRoomName
  } = useUserStore()

  // Local state for selected room - not persisted
  const [selectedRoomId, setSelectedRoomId] = useState(initialDefaultRoomId || '')

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
      try {
        // Find room name from initial data first
        const room = initialRooms.find((r) => r.id === selectedRoomId)
        let roomName = room?.name || 'Unknown Room'

        // If not found in initial data, fetch from API
        if (!room) {
          const response = await fetch(`/api/rooms/by-id/${selectedRoomId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.room && data.room.name) {
              roomName = data.room.name
            }
          }
        }

        // Use user's display name or email as username
        const username = user.user_metadata?.full_name || user.email || 'Anonymous User'
        joinRoom(username, selectedRoomId, roomName)
      } catch (error) {
        console.error('Error fetching room data:', error)
        const username = user.user_metadata?.full_name || user.email || 'Anonymous User'
        joinRoom(username, selectedRoomId, 'Unknown Room')
      }
    }
  }

  const handleRoomChange = async (roomId: string) => {
    // Update local selected room state
    setSelectedRoomId(roomId)
    // Only update the store values if user is already joined
    // Otherwise, just update the form state
    if (isJoined) {
      try {
        // Find room name from initial data first
        const room = initialRooms.find((r) => r.id === roomId)

        if (room) {
          setRoomId(roomId)
          setRoomName(room.name)
        } else {
          // Fallback to API if not in initial data
          const response = await fetch(`/api/rooms/by-id/${roomId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.room && data.room.name) {
              setRoomId(roomId)
              setRoomName(data.room.name)
            } else {
              console.error('Invalid room data received:', data)
            }
          } else {
            console.error(
              'Failed to fetch room data:',
              response.status,
              response.statusText
            )
          }
        }
      } catch (error) {
        console.error('Error fetching room data:', error)
      }
    }
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

  if (!isJoined) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Realtime Chat</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Enter your details to join the chat
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
                    <div className="text-sm text-muted-foreground">
                      {user.email}
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

  return (
    <div className="h-dvh flex flex-col bg-background">
      <header className="border-b border-border p-3 sm:p-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="w-16"></div>
          <h1 className="text-base sm:text-lg font-semibold flex-1 text-center">
            {storedRoomName}
          </h1>
          <Button
            onClick={leaveRoom}
            className="text-xs sm:text-sm text-gray-800 bg-white hover:text-white hover:bg-gray-700 transition-colors px-2 py-1 rounded border border-gray-200"
          >
            Leave
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <RealtimeChat
          roomId={storedRoomId}
          roomName={storedRoomName}
          username={user?.user_metadata?.full_name || user?.email || 'Anonymous User'}
          userId={userId}
        />
      </div>
    </div>
  )
}
