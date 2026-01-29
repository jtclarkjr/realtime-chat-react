'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../query-keys'
import { getRooms } from '@/lib/api/client'
import type { DatabaseRoom } from '@/lib/types/database'

interface UseRoomsOptions {
  enabled?: boolean
  initialData?: DatabaseRoom[]
}

export function useRooms({
  enabled = true,
  initialData
}: UseRoomsOptions = {}) {
  return useQuery({
    queryKey: queryKeys.rooms.list(),
    queryFn: async () => {
      const response = await getRooms()
      return response.rooms
    },
    enabled,
    initialData,
    staleTime: 60 * 1000
  })
}
