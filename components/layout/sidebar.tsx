'use client'

import { RoomList } from './room-list'
import { UserSection } from './user-section'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Home } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useUIStore } from '@/lib/stores/ui-store'
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
      className="h-full flex flex-col"
      aria-label="Main navigation"
      role="navigation"
    >
      {/* Logo / App name */}
      <div className="p-4 border-b border-border flex items-center justify-between gap-2">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleHomeClick}
                title="Go to home"
              >
                <Home className="h-4 w-4" />
                <span className="sr-only">Go to home</span>
              </Button>
              <h1 className="text-lg font-bold">Realtime Chat</h1>
            </div>
            {/* Collapse button - only show on desktop */}
            {!onNavigate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={toggleSidebar}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Collapse sidebar</span>
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleHomeClick}
              title="Go to home"
            >
              <Home className="h-4 w-4" />
              <span className="sr-only">Go to home</span>
            </Button>
            {/* Collapse button - only show on desktop */}
            {!onNavigate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleSidebar}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Expand sidebar</span>
              </Button>
            )}
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
      <UserSection user={user} collapsed={collapsed} />
    </nav>
  )
}
