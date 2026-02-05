'use client'

import { Sidebar } from './sidebar'
import { TopBar } from './top-bar'
import { AnonymousBanner } from '@/components/anonymous-banner'
import { useUIStore } from '@/lib/stores/ui-store'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import type { DatabaseRoom } from '@/lib/types/database'
import type { PublicUser } from '@/lib/types/user'
import { cn } from '@/lib/utils'

interface AuthenticatedLayoutClientProps {
  user: PublicUser
  initialRooms: DatabaseRoom[]
  initialDefaultRoomId: string | null
  children: React.ReactNode
}

export function AuthenticatedLayoutClient({
  user,
  initialRooms,
  initialDefaultRoomId,
  children
}: AuthenticatedLayoutClientProps) {
  const { sidebarCollapsed, mobileDrawerOpen, setMobileDrawerOpen } =
    useUIStore()

  return (
    <div className="h-dvh flex flex-col w-full">
      {user.isAnonymous && <AnonymousBanner />}

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar - hidden on mobile */}
        <aside
          className={cn(
            'hidden md:flex flex-col border-r border-border bg-background transition-all duration-300 ease-in-out',
            sidebarCollapsed ? 'w-16' : 'w-60'
          )}
        >
          <Sidebar
            user={user}
            initialRooms={initialRooms}
            initialDefaultRoomId={initialDefaultRoomId}
            collapsed={sidebarCollapsed}
          />
        </aside>

        {/* Mobile Sidebar Drawer */}
        <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <SheetContent side="left" className="p-0 w-60">
            <Sidebar
              user={user}
              initialRooms={initialRooms}
              initialDefaultRoomId={initialDefaultRoomId}
              collapsed={false}
              onNavigate={() => setMobileDrawerOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <TopBar user={user} />
          <div className="flex-1 overflow-hidden">{children}</div>
        </main>
      </div>
    </div>
  )
}
