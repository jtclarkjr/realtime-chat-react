'use client'

import { useAuthenticatedUserContext } from '@/components/layout/authenticated-user-context'

export function useAuthenticatedUser() {
  return useAuthenticatedUserContext()
}
