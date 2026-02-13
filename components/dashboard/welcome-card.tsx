'use client'

import { UserAvatar } from '@/components/ui/user-avatar'
import type { PublicUser } from '@/lib/types/user'

interface WelcomeCardProps {
  user: PublicUser
}

export function WelcomeCard({ user }: WelcomeCardProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <UserAvatar src={user.avatarUrl} alt={user.username} size="lg" />
        <div>
          <h1 className="text-3xl font-bold">
            {user.isAnonymous
              ? `Welcome, ${user.username}!`
              : `Welcome back, ${user.username}!`}
          </h1>
          <p className="text-muted-foreground">
            {user.isAnonymous ? "You're browsing as a guest" : 'Ready to chat?'}
          </p>
        </div>
      </div>
    </div>
  )
}
