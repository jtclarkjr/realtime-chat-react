'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createRoomAction } from '@/lib/actions/room-actions'
import { queryKeys } from '../query-keys'
import type { DatabaseRoom } from '@/lib/types/database'

interface CreateRoomVariables {
  name: string
  description?: string
}

interface CreateRoomResult {
  success: boolean
  room?: DatabaseRoom
  error?: string
}

export function useCreateRoom() {
  const queryClient = useQueryClient()

  return useMutation<CreateRoomResult, Error, CreateRoomVariables>({
    mutationFn: async ({ name, description }) => {
      return createRoomAction(name, description)
    },
    onSuccess: (data) => {
      if (data.success && data.room) {
        // Update React Query cache with the new room
        queryClient.setQueryData<DatabaseRoom[]>(
          queryKeys.rooms.list(),
          (oldData) => {
            if (!oldData) return [data.room!]
            const exists = oldData.some((r) => r.id === data.room!.id)
            if (exists) return oldData
            return [...oldData, data.room!]
          }
        )

        // Invalidate to ensure fresh data
        queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all })
      }
    }
  })
}
