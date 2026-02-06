'use client'

import { RoomList } from './room-list'
import { UserSection } from './user-section'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Home } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useUIStore } from '@/lib/stores/ui-store'
import { cn } from '@/lib/utils'
import type { DatabaseRoom } from '@/lib/types/database'
import type { PublicUser } from '@/lib/types/user'

interface SidebarProps {
  user: PublicUser
  initialRooms: DatabaseRoom[]
  initialDefaultRoomId: string | null
  collapsed: boolean
  onNavigate?: () => void
}

export function Sidebar({
  user,
  initialRooms,
  collapsed,
  onNavigate
}: SidebarProps) {
  const params = useParams()
  const router = useRouter()
  const { toggleSidebar } = useUIStore()
  const activeRoomId = params?.id as string | undefined

  const handleHomeClick = () => {
    router.push('/')
    onNavigate?.()
  }

  return (
    <nav
      className="relative h-full flex flex-col"
      aria-label="Main navigation"
      role="navigation"
    >
      {!onNavigate && (
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'absolute left-full top-4 z-20 h-7 w-7 -translate-x-1/2 rounded-full border-border !bg-background dark:!bg-background shadow-sm cursor-pointer',
            'hover:bg-accent hover:text-accent-foreground'
          )}
          onClick={toggleSidebar}
        >
          {collapsed ? (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="sr-only">Expand sidebar</span>
            </>
          ) : (
            <>
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="sr-only">Collapse sidebar</span>
            </>
          )}
        </Button>
      )}

      {/* Logo / App name */}
      <div className="p-4 border-b border-border flex items-center justify-between gap-2">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 cursor-pointer"
                onClick={handleHomeClick}
                title="Go to home"
              >
                <Home className="h-4 w-4" />
                <span className="sr-only">Go to home</span>
              </Button>
              <button
                type="button"
                onClick={handleHomeClick}
                className="cursor-pointer text-lg font-bold hover:text-primary transition-colors"
                title="Go to home"
              >
                Realtime Chat
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={handleHomeClick}
              title="Go to home"
            >
              <Home className="h-4 w-4" />
              <span className="sr-only">Go to home</span>
            </Button>
          </div>
        )}
      </div>

      {/* Room list */}
      <RoomList
        activeRoomId={activeRoomId || null}
        collapsed={collapsed}
        initialRooms={initialRooms}
        user={user}
        onNavigate={onNavigate}
      />

      {/* User section at bottom */}
      <UserSection
        user={user}
        collapsed={collapsed}
        initialRooms={initialRooms}
      />
    </nav>
  )
}
