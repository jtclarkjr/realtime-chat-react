'use client'

import { useEffect, useState, useCallback } from 'react'
import { track } from '@vercel/analytics/react'
import {
  Combobox,
  type ComboboxOption,
  type ComboboxAction
} from '@/components/ui/combobox'
import { MessageCircle, Trash2 } from 'lucide-react'
import { AddRoomDialog } from '@/components/add-room-dialog'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import type { DatabaseRoom } from '@/lib/types/database'
import { deleteRoomAction } from '@/lib/actions/room-actions'
import { toast } from 'sonner'

interface RoomSelectorProps {
  selectedRoom: string
  onRoomChange: (roomId: string) => void
  disabled?: boolean
  showAddRoom?: boolean
  initialRooms?: DatabaseRoom[]
  currentUserId?: string // User ID to check permissions
}

export function RoomSelector({
  selectedRoom,
  onRoomChange,
  disabled = false,
  showAddRoom = true,
  initialRooms = [],
  currentUserId
}: RoomSelectorProps) {
  const [rooms, setRooms] = useState<DatabaseRoom[]>(initialRooms)
  const [loading, setLoading] = useState<boolean>(initialRooms.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean
    roomId: string | null
    roomName: string | null
  }>({ open: false, roomId: null, roomName: null })
  const [announcement, setAnnouncement] = useState<string>('')

  // Memoize onRoomChange to prevent useEffect re-runs
  const memoizedOnRoomChange = useCallback(onRoomChange, [onRoomChange])

  const loadRooms = async (): Promise<DatabaseRoom[]> => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all rooms (API will ensure default rooms exist)
      const response = await fetch('/api/rooms')
      if (!response.ok) {
        throw new Error('Failed to fetch rooms')
      }

      const { rooms: roomsData } = await response.json()
      setRooms(roomsData)

      return roomsData
    } catch (err) {
      console.error('Failed to load rooms:', err)
      setError('Failed to load rooms')
      return []
    } finally {
      setLoading(false)
    }
  }

  // Load rooms only if we don't have initial data
  useEffect(() => {
    if (initialRooms.length === 0) {
      loadRooms()
    }
  }, [initialRooms.length]) // Only run if we don't have initial rooms

  // Handle default room selection separately - only if no room is selected AND we have initial rooms
  // This prevents auto-selection during revalidation when rooms are updated
  useEffect(() => {
    if (!selectedRoom && rooms.length > 0 && initialRooms.length > 0) {
      // Only auto-select when we have initial rooms (first load), not during updates
      const generalRoom = rooms.find((room) => room.name === 'general')
      const defaultRoom = generalRoom || rooms[0]
      memoizedOnRoomChange(defaultRoom.id)
    }
  }, [selectedRoom, rooms, memoizedOnRoomChange, initialRooms.length])

  // Update rooms when initialRooms change (for cases where initial data loads later)
  useEffect(() => {
    if (initialRooms.length > 0 && rooms.length === 0) {
      setRooms(initialRooms)
      setLoading(false)
    }
  }, [initialRooms, rooms.length])

  const handleDeleteRoomClick = (roomId: string): void => {
    if (deleting || !currentUserId) return

    const room = rooms.find((r) => r.id === roomId)
    if (!room) return

    setConfirmDelete({
      open: true,
      roomId,
      roomName: room.name
    })
  }

  const handleDeleteRoomConfirm = async (): Promise<void> => {
    const { roomId } = confirmDelete
    if (!roomId) return

    setDeleting(roomId)
    setConfirmDelete({ open: false, roomId: null, roomName: null })

    try {
      const result = await deleteRoomAction(roomId)

      if (result.success) {
        if (currentUserId) {
          track('event_room_deleted', { roomId, userId: currentUserId })
        }

        // Remove the room from the list
        setRooms((prevRooms) => prevRooms.filter((room) => room.id !== roomId))

        // If the deleted room was selected, switch to another room
        const wasSelectedRoomDeleted = selectedRoom === roomId
        const hasOtherRoomsAvailable = rooms.length > 1

        if (wasSelectedRoomDeleted && hasOtherRoomsAvailable) {
          // Find all rooms except the deleted one
          const remainingRooms = rooms.filter((room) => room.id !== roomId)

          // Prefer 'general' room as fallback, otherwise use the first available room
          const generalRoom = remainingRooms.find(
            (room) => room.name === 'general'
          )
          const [firstRoom] = remainingRooms
          const fallbackRoom = generalRoom || firstRoom

          // Switch to the fallback room
          onRoomChange(fallbackRoom.id)
        }

        toast.success('Room deleted successfully', {
          description: `"${confirmDelete.roomName}" has been deleted along with all its messages.`,
          duration: 4000
        })

        // Announce to screen readers
        setAnnouncement(
          `Room ${confirmDelete.roomName} has been successfully deleted`
        )
      } else {
        console.error('Failed to delete room:', result.error)
        toast.error('Failed to delete room', {
          description:
            result.error ||
            'An unexpected error occurred while deleting the room.',
          duration: 6000
        })
      }
    } catch (error) {
      console.error('Error deleting room:', error)
      toast.error('Failed to delete room', {
        description: 'An unexpected error occurred while deleting the room.',
        duration: 6000
      })
    } finally {
      setDeleting(null)
    }
  }

  const handleRoomCreated = async (newRoom: DatabaseRoom): Promise<void> => {
    // Add the new room to the list and select it
    setRooms((prevRooms) => {
      // Check if room already exists to avoid duplicates
      const exists = prevRooms.some((room) => room.id === newRoom.id)
      if (exists) {
        return prevRooms
      }
      return [...prevRooms, newRoom]
    })
    // Select the new room
    onRoomChange(newRoom.id)
  }

  const truncateDescription = (
    description: string,
    maxLength: number = 30
  ): string => {
    if (description.length <= maxLength) return description
    return description.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <MessageCircle className="h-4 w-4" />
        Loading rooms...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-destructive">
        <MessageCircle className="h-4 w-4" />
        {error}
      </div>
    )
  }

  // Convert rooms to combobox options
  const comboboxOptions: ComboboxOption[] = rooms.map((room) => {
    const actions: ComboboxAction[] = []

    // Add delete action if user has permission and it's not the currently selected room
    if (
      currentUserId &&
      room.created_by === currentUserId &&
      room.id !== selectedRoom
    ) {
      actions.push({
        icon: Trash2,
        label: 'Delete room',
        onClick: handleDeleteRoomClick,
        disabled: (roomId) => deleting === roomId || roomId === selectedRoom,
        variant: 'destructive'
      })
    }

    return {
      value: room.id,
      label: `# ${room.name}`,
      description: room.description
        ? truncateDescription(room.description)
        : undefined,
      actions: actions.length > 0 ? actions : undefined
    }
  })

  return (
    <div className="flex items-center gap-2 w-full">
      <Combobox
        options={comboboxOptions}
        value={selectedRoom}
        onSelect={onRoomChange}
        placeholder="Select a room"
        searchPlaceholder="Search rooms..."
        emptyMessage="No rooms found."
        disabled={disabled}
        triggerClassName="pl-10 pr-10"
      />

      {showAddRoom && (
        <AddRoomDialog
          onRoomCreated={handleRoomCreated}
          disabled={disabled}
          existingRooms={rooms}
        />
      )}

      <ConfirmationDialog
        open={confirmDelete.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDelete({ open: false, roomId: null, roomName: null })
          }
        }}
        title="Delete Room"
        description={
          confirmDelete.roomName
            ? `Are you sure you want to delete "${confirmDelete.roomName}"? This action cannot be undone and will permanently delete the room and all messages in it.`
            : 'Are you sure you want to delete this room? This action cannot be undone.'
        }
        confirmText="Delete Room"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteRoomConfirm}
        loading={deleting === confirmDelete.roomId}
      />

      {/* Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </div>
  )
}
