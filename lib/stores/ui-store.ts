import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UIState {
  // Sidebar state
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void

  // Unread counts per room
  unreadCounts: Record<string, number>
  incrementUnread: (roomId: string) => void
  clearUnread: (roomId: string) => void
  setUnreadCount: (roomId: string, count: number) => void

  // Recent rooms for dashboard
  recentRooms: string[]
  addRecentRoom: (roomId: string) => void

  // Mobile drawer state (not persisted)
  mobileDrawerOpen: boolean
  setMobileDrawerOpen: (open: boolean) => void
}

type PersistedState = Pick<
  UIState,
  'sidebarCollapsed' | 'unreadCounts' | 'recentRooms'
>

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Sidebar state
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Unread counts
      unreadCounts: {},
      incrementUnread: (roomId) =>
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [roomId]: (state.unreadCounts[roomId] || 0) + 1
          }
        })),
      clearUnread: (roomId) =>
        set((state) => {
          const { [roomId]: _, ...rest } = state.unreadCounts
          return { unreadCounts: rest }
        }),
      setUnreadCount: (roomId, count) =>
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [roomId]: count
          }
        })),

      // Recent rooms
      recentRooms: [],
      addRecentRoom: (roomId) =>
        set((state) => {
          const filtered = state.recentRooms.filter((id) => id !== roomId)
          return {
            recentRooms: [roomId, ...filtered].slice(0, 10) // Keep last 10
          }
        }),

      // Mobile drawer (not persisted)
      mobileDrawerOpen: false,
      setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open })
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) =>
        ({
          sidebarCollapsed: state.sidebarCollapsed,
          unreadCounts: state.unreadCounts,
          recentRooms: state.recentRooms
        }) as PersistedState
    }
  )
)
