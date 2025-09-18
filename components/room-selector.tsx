'use client'

import { useEffect, useState, useCallback } from 'react'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { MessageCircle } from 'lucide-react'
import { AddRoomDialog } from '@/components/add-room-dialog'
import type { DatabaseRoom } from '@/lib/types/database'

interface RoomSelectorProps {
  selectedRoom: string
  onRoomChange: (roomId: string) => void
  disabled?: boolean
  showAddRoom?: boolean
  initialRooms?: DatabaseRoom[]
}

export function RoomSelector({
  selectedRoom,
  onRoomChange,
  disabled = false,
  showAddRoom = true,
  initialRooms = []
}: RoomSelectorProps) {
  const [rooms, setRooms] = useState<DatabaseRoom[]>(initialRooms)
  const [loading, setLoading] = useState(initialRooms.length === 0)
  const [error, setError] = useState<string | null>(null)

  // Memoize onRoomChange to prevent useEffect re-runs
  const memoizedOnRoomChange = useCallback(onRoomChange, [onRoomChange])

  const loadRooms = async () => {
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

  const handleRoomCreated = async (newRoom: DatabaseRoom) => {
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

  const truncateDescription = (description: string, maxLength: number = 30) => {
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
  const comboboxOptions: ComboboxOption[] = rooms.map((room) => ({
    value: room.id,
    label: `# ${room.name}`,
    description: room.description
      ? truncateDescription(room.description)
      : undefined
  }))

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
    </div>
  )
}
