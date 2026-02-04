'use client'

import { useMutation } from '@tanstack/react-query'
import { sendMessage } from '@/lib/api/client'
import type { SendMessageRequest, SendMessageResponse } from '@/lib/types/api'

export function useSendMessage() {
  return useMutation<SendMessageResponse, Error, SendMessageRequest>({
    mutationFn: async (data) => {
      return sendMessage(data)
    }
  })
}
