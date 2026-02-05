'use client'

import { UserAvatar } from '@/components/ui/user-avatar'
import { MessageCircle } from 'lucide-react'
import type { PublicUser } from '@/lib/types/user'

interface WelcomeCardProps {
  user: PublicUser
}

export function WelcomeCard({ user }: WelcomeCardProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Welcome header */}
      <div className="flex items-center gap-4">
        <UserAvatar src={user.avatarUrl} alt={user.username} size="lg" />
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user.username}!
          </h1>
          <p className="text-muted-foreground">
            {user.isAnonymous
              ? 'You\'re browsing as a guest'
              : 'Ready to chat?'}
          </p>
        </div>
      </div>

      {/* Quick info card */}
      <div className="bg-muted/50 rounded-lg p-6 border border-border">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <MessageCircle className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">Start chatting</h2>
            <p className="text-sm text-muted-foreground">
              Select a channel from the sidebar to join the conversation, or
              create a new one to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
