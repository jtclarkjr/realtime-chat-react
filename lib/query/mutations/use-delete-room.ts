'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteRoomAction } from '@/lib/actions/room-actions'
import { queryKeys } from '../query-keys'
import type { DatabaseRoom } from '@/lib/types/database'

interface DeleteRoomVariables {
  roomId: string
}

interface DeleteRoomResult {
  success: boolean
  error?: string
}

export function useDeleteRoom() {
  const queryClient = useQueryClient()

  return useMutation<DeleteRoomResult, Error, DeleteRoomVariables>({
    mutationFn: async ({ roomId }) => {
      return deleteRoomAction(roomId)
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
