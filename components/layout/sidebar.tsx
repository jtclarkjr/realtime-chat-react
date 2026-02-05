'use client'

import { RoomList } from './room-list'
import { UserSection } from './user-section'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useParams } from 'next/navigation'
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
  const { toggleSidebar } = useUIStore()
  const activeRoomId = params?.id as string | undefined

  return (
    <nav
      className="h-full flex flex-col"
      aria-label="Main navigation"
      role="navigation"
    >
      {/* Logo / App name */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && <h1 className="text-lg font-bold">Realtime Chat</h1>}
        {collapsed && (
          <div className="text-lg font-bold text-center w-full">RC</div>
        )}
        {/* Collapse button - only show on desktop */}
        {!onNavigate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={toggleSidebar}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
            <span className="sr-only">
              {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </span>
          </Button>
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
