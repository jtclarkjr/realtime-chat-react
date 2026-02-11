'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../query-keys'
import { getMissedMessages, transformApiMessage } from '@/lib/api/client'
import type { ChatMessage } from '@/lib/types/database'

interface UseMissedMessagesOptions {
  roomId: string
  userId: string
  enabled?: boolean
}

export function useMissedMessages({
  roomId,
  userId,
  enabled = true
}: UseMissedMessagesOptions) {
  return useQuery({
    queryKey: queryKeys.messages.missed(roomId, userId),
    queryFn: async ({ signal }) => {
      try {
        const data = await getMissedMessages(roomId, userId, signal)

        if (
          (data.type === 'missed_messages' ||
            data.type === 'recent_messages') &&
          data.messages?.length > 0
        ) {
          return data.messages.map(transformApiMessage)
        }

        return [] as ChatMessage[]
      } catch (error) {
        // Preserve last successful cache data if this request is aborted.
        if (error instanceof Error && error.name === 'AbortError') {
          throw error
        }
        throw error
      }
    },
    enabled: enabled && !!roomId && !!userId,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
    gcTime: 30 * 60 * 1000
  })
}
