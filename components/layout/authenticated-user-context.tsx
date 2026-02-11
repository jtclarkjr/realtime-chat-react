'use client'

import { createContext, useContext } from 'react'
import type { PublicUser } from '@/lib/types/user'

const AuthenticatedUserContext = createContext<PublicUser | null>(null)

interface AuthenticatedUserProviderProps {
  user: PublicUser
  children: React.ReactNode
}

export function AuthenticatedUserProvider({
  user,
  children
}: AuthenticatedUserProviderProps) {
  return (
    <AuthenticatedUserContext.Provider value={user}>
      {children}
    </AuthenticatedUserContext.Provider>
  )
}

export function useAuthenticatedUserContext() {
  const user = useContext(AuthenticatedUserContext)
  if (!user) {
    throw new Error(
      'useAuthenticatedUser must be used within AuthenticatedUserProvider'
    )
  }
  return user
}
