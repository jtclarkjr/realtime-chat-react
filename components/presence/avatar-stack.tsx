'use client'

import { UserAvatar } from '@/components/ui/user-avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { PresenceUser } from '@/lib/types/presence'

interface AvatarStackProps {
  users: PresenceUser[]
  currentUserId: string
  maxVisible?: number
  size?: 'sm' | 'md'
  className?: string
}

export function AvatarStack({
  users,
  currentUserId,
  maxVisible = 5,
  size = 'sm',
  className
}: AvatarStackProps) {
  if (users.length === 0) {
    return null
  }

  const visibleUsers = users.slice(0, maxVisible)
  const overflowCount = users.length - maxVisible

  return (
    <TooltipProvider>
      <div className={cn('flex items-center', className)}>
        {visibleUsers.map((user, index) => {
          const isCurrentUser = user.id === currentUserId

          return (
            <Tooltip key={user.id} delayDuration={300}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'relative inline-block transition-transform hover:scale-110 hover:z-10',
                    index !== 0 && '-ml-2'
                  )}
                  style={{
                    zIndex: visibleUsers.length - index
                  }}
                >
                  <UserAvatar
                    src={user.avatar_url}
                    alt={user.name}
                    size={size}
                    className={cn(
                      'ring-2 ring-background',
                      isCurrentUser && 'ring-primary'
                    )}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {user.name}
                  {isCurrentUser ? ' (you)' : ''}
                </p>
              </TooltipContent>
            </Tooltip>
          )
        })}

        {overflowCount > 0 && (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <div
                className="relative inline-flex items-center justify-center size-6 -ml-2 rounded-full bg-muted text-muted-foreground text-xs font-medium ring-2 ring-background hover:scale-110 transition-transform cursor-default"
                style={{ zIndex: 0 }}
              >
                +{overflowCount}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col gap-1">
                {users.slice(maxVisible).map((user) => (
                  <p key={user.id} className="text-xs">
                    {user.name}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
