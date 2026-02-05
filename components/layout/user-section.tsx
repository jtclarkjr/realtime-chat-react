'use client'

import { UserAvatar } from '@/components/ui/user-avatar'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { LogOut, Settings, ChevronUp } from 'lucide-react'
import { signOutAction } from '@/lib/actions/auth-actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { PublicUser } from '@/lib/types/user'
import { cn } from '@/lib/utils'
import { useNetworkConnectivity } from '@/hooks/connection/use-network-connectivity'

interface UserSectionProps {
  user: PublicUser
  collapsed: boolean
}

export function UserSection({ user, collapsed }: UserSectionProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { isOnline } = useNetworkConnectivity()

  let presenceLabel = 'Offline'
  let presenceDotClass = 'bg-red-500'

  if (user.isAnonymous) {
    presenceLabel = 'Guest'
    presenceDotClass = 'bg-muted-foreground/60'
  } else if (isOnline) {
    presenceLabel = 'Online'
    presenceDotClass = 'bg-green-500'
  }

  const handleSignOut = async () => {
    try {
      setOpen(false)
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors',
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
              <>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium text-sm truncate">
                    {user.username}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span
                      className={cn(
                        'inline-block h-2 w-2 rounded-full',
                        presenceDotClass
                      )}
                      aria-hidden="true"
                    />
                    <span>{presenceLabel}</span>
                  </div>
                </div>
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              </>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align={collapsed ? 'center' : 'start'}
          className="w-56 p-2"
        >
          <div className="flex items-center gap-3 px-2 py-1.5 mb-2">
            <UserAvatar
              src={user.avatarUrl}
              alt={user.username}
              size="md"
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {user.username}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-block h-2 w-2 rounded-full',
                    presenceDotClass
                  )}
                  aria-hidden="true"
                />
                <span>{presenceLabel}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-border mb-2" />

          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            disabled
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Button>

          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="text-sm text-muted-foreground">Theme</span>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>

          <div className="border-t border-border my-2" />

          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            <span>{user.isAnonymous ? 'Leave' : 'Sign Out'}</span>
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  )
}
