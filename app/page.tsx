'use client'

import { RealtimeChat } from '@/components/realtime-chat'
import { Button } from '@/components/ui/button'
import { useUserStore, useInitializeUser } from '@/lib/stores/user-store'
import { useState, useEffect } from 'react'

export default function Home() {
  const {
    userId,
    username: storedUsername,
    roomName: storedRoomName,
    isJoined,
    joinRoom,
    leaveRoom
  } = useUserStore()

  // Local form state (before joining)
  const [formUsername, setFormUsername] = useState(storedUsername)
  const [formRoomName, setFormRoomName] = useState(storedRoomName)

  // Initialize userId
  useInitializeUser()

  // Sync form state with stored values when they change
  useEffect(() => {
    setFormUsername(storedUsername)
    setFormRoomName(storedRoomName)
  }, [storedUsername, storedRoomName])

  const handleJoinChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (formUsername.trim() && formRoomName.trim() && userId) {
      joinRoom(formUsername, formRoomName)
    }
  }

  // Don't render until we have userId
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-muted-foreground">Initializing...</div>
        </div>
      </div>
    )
  }

  if (!isJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Realtime Chat</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Enter your details to join the chat
            </p>
          </div>

          <form onSubmit={handleJoinChat} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                className="w-full px-4 py-3 text-base border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="room" className="text-sm font-medium">
                Room
              </label>
              <input
                id="room"
                type="text"
                placeholder="Enter room name"
                value={formRoomName}
                onChange={(e) => setFormRoomName(e.target.value)}
                className="w-full px-4 py-3 text-base border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 px-4 rounded-lg font-medium text-base transition-colors duration-200 active:scale-95"
            >
              Join Chat
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
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
          roomName={storedRoomName}
          username={storedUsername}
          userId={userId}
        />
      </div>
    </div>
  )
}
