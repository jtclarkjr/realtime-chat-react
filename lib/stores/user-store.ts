import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UserState {
  userId: string
  username: string
  roomId: string // Current joined room ID
  isJoined: boolean

  // Actions
  setUserId: (userId: string) => void
  setUsername: (username: string) => void
  setRoomId: (roomId: string) => void
  setJoined: (joined: boolean) => void
  joinRoom: (username: string, roomId: string) => void
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
      roomId: '',
      isJoined: false,

      // Actions
      setUserId: (userId) => set({ userId }),
      setUsername: (username) => set({ username }),
      setRoomId: (roomId) => set({ roomId }),
      setJoined: (joined) => set({ isJoined: joined }),

      joinRoom: (username, roomId) =>
        set({
          username: username.trim(),
          roomId: roomId.trim(),
          isJoined: true
        }),

      leaveRoom: () =>
        set({
          isJoined: false
        }),

      reset: () =>
        set({
          userId: generateUserId(),
          username: '',
          roomId: '',
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
        roomId: state.roomId,
        // Don't persist isJoined or selectedRoomId - always start fresh
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
