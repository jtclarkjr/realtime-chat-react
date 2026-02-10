'use client'

import { useState } from 'react'
import { Plus, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddRoomDialog } from '@/components/add-room-dialog'
import { useRooms } from '@/lib/query/queries/use-rooms'
import type { DatabaseRoom } from '@/lib/types/database'
import type { PublicUser } from '@/lib/types/user'

interface CreateRoomCardProps {
  user: PublicUser
  initialRooms: DatabaseRoom[]
}

export function CreateRoomCard({ user, initialRooms }: CreateRoomCardProps) {
  const [showAddRoom, setShowAddRoom] = useState(false)

  const { data: rooms = [] } = useRooms({
    initialData: initialRooms.length > 0 ? initialRooms : undefined
  })

  const handleRoomCreated = async (): Promise<void> => {
    // Room will be automatically added to the list via React Query
    setShowAddRoom(false)
  }

  // Don't show for anonymous users
  if (user.isAnonymous) {
    return null
  }

  return (
    <>
      <div className="max-w-2xl mx-auto">
        <Button
          variant="outline"
          className="w-full h-auto p-4 sm:p-6 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all group cursor-pointer"
          onClick={() => setShowAddRoom(true)}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full min-w-0">
            <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors shrink-0">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="font-semibold text-base mb-1 flex items-center gap-2 min-w-0">
                <Hash className="h-4 w-4 shrink-0" />
                Create a new channel
              </div>
              <p className="text-sm text-muted-foreground break-words">
                Start a new conversation space for your community
              </p>
            </div>
          </div>
        </Button>
      </div>

      {/* Add room dialog */}
      <AddRoomDialog
        open={showAddRoom}
        onOpenChange={setShowAddRoom}
        onRoomCreated={handleRoomCreated}
        existingRooms={rooms}
      />
    </>
  )
}
