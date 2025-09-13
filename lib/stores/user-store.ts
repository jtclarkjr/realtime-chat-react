import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UserState {
  userId: string
  username: string
  roomName: string
  isJoined: boolean

  // Actions
  setUserId: (userId: string) => void
  setUsername: (username: string) => void
  setRoomName: (roomName: string) => void
  setJoined: (joined: boolean) => void
  joinRoom: (username: string, roomName: string) => void
  leaveRoom: () => void
  reset: () => void
}

// Generate a new user ID
const generateUserId = () => crypto.randomUUID()

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // Initial state
      userId: '',
      username: '',
      roomName: 'general',
      isJoined: false,

      // Actions
      setUserId: (userId) => set({ userId }),
      setUsername: (username) => set({ username }),
      setRoomName: (roomName) => set({ roomName }),
      setJoined: (joined) => set({ isJoined: joined }),

      joinRoom: (username, roomName) =>
        set({
          username: username.trim(),
          roomName: roomName.trim(),
          isJoined: true
        }),

      leaveRoom: () =>
        set({
          isJoined: false
          // Keep username and roomName for easy re-join
        }),

      reset: () =>
        set({
          userId: generateUserId(),
          username: '',
          roomName: 'general',
          isJoined: false
        })
    }),
    {
      name: 'chat-user-store',
      storage: createJSONStorage(() => {
        // Handle SSR by checking if localStorage is available
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
          }
        }
        return localStorage
      }),
      // Only persist these fields
      partialize: (state) => ({
        userId: state.userId,
        username: state.username,
        roomName: state.roomName
        // Don't persist isJoined - always start as not joined
      }),
      // Initialize userId if not present
      onRehydrateStorage: () => (state) => {
        if (!state?.userId) {
          state?.setUserId(generateUserId())
        }
      }
    }
  )
)

// Hook to ensure userId is initialized
export const useInitializeUser = () => {
  const { userId, setUserId } = useUserStore()

  // Initialize userId on first load if not present
  if (!userId) {
    const newId = generateUserId()
    setUserId(newId)
    return newId
  }

  return userId
}
