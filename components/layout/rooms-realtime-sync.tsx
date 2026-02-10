'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/query-keys'

interface RoomsRealtimeSyncProps {
  userId: string
}

export function RoomsRealtimeSync({ userId }: RoomsRealtimeSyncProps) {
  const queryClient = useQueryClient()
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current
    const channel = supabase
      .channel(`rooms-sync-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms'
        },
        () => {
          // Refetch all room queries when rooms are created, updated, or deleted.
          void queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, userId])

  return null
}
