'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../query-keys'
import { getRoomById } from '@/lib/api/client'
import type { DatabaseRoom } from '@/lib/types/database'

interface UseRoomByIdOptions {
  roomId: string
  enabled?: boolean
  initialData?: DatabaseRoom
}

export function useRoomById({
  roomId,
  enabled = true,
  initialData
}: UseRoomByIdOptions) {
  return useQuery({
    queryKey: queryKeys.rooms.detail(roomId),
    queryFn: async () => {
      const response = await getRoomById(roomId)
      return response.room
    },
    enabled: enabled && !!roomId,
    initialData
  })
}
