'use client'

import { Button } from '@/components/ui/button'
import { Bell, Menu } from 'lucide-react'
import { useUIStore } from '@/lib/stores/ui-store'
import { NotificationDropdown } from './notification-dropdown'
import type { PublicUser } from '@/lib/types/user'
import type { DatabaseRoom } from '@/lib/types/database'

interface TopBarProps {
  user: PublicUser
  initialRooms: DatabaseRoom[]
}

export function TopBar({ user, initialRooms }: TopBarProps) {
  const { unreadCounts, setMobileDrawerOpen } = useUIStore()

  // Calculate total unread count
  const totalUnread = Object.values(unreadCounts).reduce(
    (sum, count) => sum + count,
    0
  )

  return (
    <header className="border-b border-border bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileDrawerOpen(true)}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>

        {/* Spacer for desktop */}
        <div className="hidden md:block flex-1" />

        {/* Right side - Notifications */}
        <div className="flex items-center gap-2">
          <NotificationDropdown initialRooms={initialRooms}>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </NotificationDropdown>
        </div>
      </div>
    </header>
  )
}
