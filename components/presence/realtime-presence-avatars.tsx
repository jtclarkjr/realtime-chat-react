'use client'

import { useMemo } from 'react'
import { AvatarStack } from './avatar-stack'
import type { PresenceState, PresenceUser } from '@/lib/types/presence'

interface RealtimePresenceAvatarsProps {
  presenceUsers: PresenceState
  currentUserId: string
  currentUserName: string
  currentUserAvatar?: string
}

export function RealtimePresenceAvatars({
  presenceUsers,
  currentUserId,
  currentUserName,
  currentUserAvatar
}: RealtimePresenceAvatarsProps) {
  const usersArray = useMemo(() => {
    const users: PresenceUser[] = Object.values(presenceUsers)

    // Ensure current user is included in the list
    const hasCurrentUser = users.some((user) => user.id === currentUserId)

    if (!hasCurrentUser && currentUserId) {
      users.push({
        id: currentUserId,
        name: currentUserName,
        avatar_url: currentUserAvatar
      })
    }

    // Sort: current user first, then by name
    return users.sort((a, b) => {
      if (a.id === currentUserId) return -1
      if (b.id === currentUserId) return 1
      return a.name.localeCompare(b.name)
    })
  }, [presenceUsers, currentUserId, currentUserName, currentUserAvatar])

  if (usersArray.length === 0) {
    return null
  }

  return (
    <AvatarStack users={usersArray} currentUserId={currentUserId} size="sm" />
  )
}
