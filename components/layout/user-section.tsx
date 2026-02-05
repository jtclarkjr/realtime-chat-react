'use client'

import { UserAvatar } from '@/components/ui/user-avatar'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { LogOut, Settings } from 'lucide-react'
import { signOutAction } from '@/lib/actions/auth-actions'
import { useRouter } from 'next/navigation'
import type { PublicUser } from '@/lib/types/user'
import { cn } from '@/lib/utils'

interface UserSectionProps {
  user: PublicUser
  collapsed: boolean
}

export function UserSection({ user, collapsed }: UserSectionProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      if (user.isAnonymous) {
        // For anonymous users, just navigate to login without destroying session
        router.push('/login')
      } else {
        // For authenticated users, sign out normally
        await signOutAction()
      }
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="border-t border-border p-3">
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors',
              collapsed && 'justify-center'
            )}
          >
            <UserAvatar
              src={user.avatarUrl}
              alt={user.username}
              size="md"
              className="shrink-0"
            />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {user.username}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user.isAnonymous ? 'Guest' : 'Online'}
                </div>
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem disabled className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={handleSignOut}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>{user.isAnonymous ? 'Leave' : 'Sign Out'}</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {!collapsed && (
        <div className="flex items-center justify-between mt-2 px-2">
          <ThemeToggle />
        </div>
      )}
    </div>
  )
}
