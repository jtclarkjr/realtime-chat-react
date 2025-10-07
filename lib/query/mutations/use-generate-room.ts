'use client'

import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import type { GenerateRoomRequest, GenerateRoomResponse } from '@/lib/types/api'

export function useGenerateRoom() {
  return useMutation<GenerateRoomResponse, Error, GenerateRoomRequest>({
    mutationFn: async (data) => {
      return apiClient.generateRoomSuggestion(data)
    }
  })
}
