import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface RoomState {
  selectedRoomId: string
  setSelectedRoomId: (roomId: string) => void
}

type PersistedState = Pick<RoomState, 'selectedRoomId'>

export const useRoomStore = create<RoomState>()(
  persist(
    (set) => ({
      selectedRoomId: '',
      setSelectedRoomId: (roomId) => set({ selectedRoomId: roomId })
    }),
    {
      name: 'room-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) =>
        ({ selectedRoomId: state.selectedRoomId }) as PersistedState
    }
  )
)
