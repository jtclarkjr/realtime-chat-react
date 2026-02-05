'use client'

import { useEffect, useRef } from 'react'
import { useUIStore } from '@/lib/stores/ui-store'
import { createClient } from '@/lib/supabase/client'
import { useActiveRoomId } from '@/hooks/use-active-room-id'

interface UnreadMessageTrackerProps {
  userId: string
}

interface MessageInsertPayload {
  room_id: string
  user_id: string
  is_private: boolean
  requester_id?: string | null
  deleted_at?: string | null
}

export function UnreadMessageTracker({ userId }: UnreadMessageTrackerProps) {
  const activeRoomId = useActiveRoomId()
  const { incrementUnread } = useUIStore()
  const supabaseRef = useRef(createClient())
  const activeRoomIdRef = useRef<string | null>(activeRoomId)

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId
  }, [activeRoomId])

  useEffect(() => {
    const supabase = supabaseRef.current
    const channel = supabase
      .channel(`unread-tracker-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const message = payload.new as MessageInsertPayload
          if (!message?.room_id || message.deleted_at) return

          // Do not count messages sent by the current user.
          if (message.user_id === userId) return

          // Only count private messages visible to the current user.
          const isVisiblePrivateMessage =
            message.is_private &&
            (message.requester_id === userId || message.user_id === userId)
          if (message.is_private && !isVisiblePrivateMessage) return

          // Messages for the active room are read immediately.
          if (activeRoomIdRef.current === message.room_id) return

          incrementUnread(message.room_id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [incrementUnread, userId])

  return null
}
