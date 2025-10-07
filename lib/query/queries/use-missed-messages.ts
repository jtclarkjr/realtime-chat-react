'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../query-keys'
import { apiClient, transformApiMessage } from '@/lib/api/client'
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
        const data = await apiClient.getMissedMessages(roomId, userId, signal)

        if (
          (data.type === 'missed_messages' ||
            data.type === 'recent_messages') &&
          data.messages?.length > 0
        ) {
          return data.messages.map(transformApiMessage)
        }

        return [] as ChatMessage[]
      } catch (error) {
        // If aborted (timeout or unmount), return empty array
        // React Query will retry automatically based on retry config
        if (error instanceof Error && error.name === 'AbortError') {
          return [] as ChatMessage[]
        }
        // For other errors, let React Query handle them
        throw error
      }
    },
    enabled: enabled && !!roomId && !!userId,
    staleTime: 0,
    retry: 1,
    gcTime: 0 // Don't cache failed/aborted requests
  })
}
