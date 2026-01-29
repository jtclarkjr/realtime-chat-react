'use client'

import { useMutation } from '@tanstack/react-query'
import { unsendMessage } from '@/lib/api/client'
import type {
  UnsendMessageRequest,
  UnsendMessageResponse
} from '@/lib/types/api'

export function useUnsendMessageMutation() {
  return useMutation<UnsendMessageResponse, Error, UnsendMessageRequest>({
    mutationFn: async (data) => {
      return unsendMessage(data)
    }
  })
}
