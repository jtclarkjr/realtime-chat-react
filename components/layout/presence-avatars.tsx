'use client'

import { UserAvatar } from '@/components/ui/user-avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import type { PresenceState } from '@/lib/types/presence'

interface PresenceAvatarsProps {
  presenceUsers: PresenceState
  currentUserId?: string
  maxVisible?: number
}

export function PresenceAvatars({
  presenceUsers,
  currentUserId,
  maxVisible = 5
}: PresenceAvatarsProps) {
  const users = Object.values(presenceUsers)

  if (users.length === 0) {
    return null
  }

  // Sort: current user first, then alphabetically
  const sortedUsers = [...users].sort((a, b) => {
    if (a.id === currentUserId) return -1
    if (b.id === currentUserId) return 1
    return a.name.localeCompare(b.name)
  })

  const visibleUsers = sortedUsers.slice(0, maxVisible)
  const overflowCount = Math.max(0, users.length - maxVisible)

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {visibleUsers.map((user) => {
          const isCurrentUser = user.id === currentUserId

          return (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div
                  className={`relative ring-2 ring-background rounded-full transition-transform hover:scale-110 hover:z-10 ${
                    isCurrentUser ? 'ring-primary' : ''
                  }`}
                >
                  <UserAvatar
                    src={user.avatar_url}
                    alt={user.name}
                    size="sm"
                    className="h-7 w-7"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isCurrentUser ? `${user.name} (you)` : user.name}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}

        {overflowCount > 0 && (
          <Tooltip key="overflow">
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted text-xs font-medium ring-2 ring-background hover:scale-110 transition-transform cursor-default">
                +{overflowCount}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {sortedUsers.slice(maxVisible).map((user) => (
                  <p key={user.id}>{user.name}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
