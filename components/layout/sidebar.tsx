'use client'

import { RoomList } from './room-list'
import { UserSection } from './user-section'
import { useParams } from 'next/navigation'
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
  initialDefaultRoomId,
  collapsed,
  onNavigate
}: SidebarProps) {
  const params = useParams()
  const activeRoomId = params?.id as string | undefined

  return (
    <div className="h-full flex flex-col">
      {/* Logo / App name */}
      <div className="p-4 border-b border-border">
        {!collapsed && (
          <h1 className="text-lg font-bold">Realtime Chat</h1>
        )}
        {collapsed && (
          <div className="text-lg font-bold text-center">RC</div>
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
    </div>
  )
}
