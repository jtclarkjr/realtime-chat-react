'use client'

import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import type { SendMessageRequest, SendMessageResponse } from '@/lib/types/api'

export function useSendMessage() {
  return useMutation<SendMessageResponse, Error, SendMessageRequest>({
    mutationFn: async (data) => {
      return apiClient.sendMessage(data)
    }
  })
}
