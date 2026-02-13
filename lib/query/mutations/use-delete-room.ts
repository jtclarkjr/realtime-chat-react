'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteRoom } from '@/lib/api/client'
import { queryKeys } from '../query-keys'
import type { DatabaseRoom } from '@/lib/types/database'
import type { DeleteRoomResponse } from '@/lib/types/api'

interface DeleteRoomVariables {
  roomId: string
}

export function useDeleteRoom() {
  const queryClient = useQueryClient()

  return useMutation<DeleteRoomResponse, Error, DeleteRoomVariables>({
    mutationFn: async ({ roomId }) => {
      return deleteRoom(roomId)
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        // Remove room from React Query cache
        queryClient.setQueryData<DatabaseRoom[]>(
          queryKeys.rooms.list(),
          (oldData) => {
            if (!oldData) return []
            return oldData.filter((r) => r.id !== variables.roomId)
          }
        )

        // Invalidate to ensure fresh data
        queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all })
      }
    }
  })
}
