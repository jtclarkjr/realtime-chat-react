'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'
import { createRoomAction } from '@/lib/actions/room-actions'
import type { DatabaseRoom } from '@/lib/types/database'

interface AddRoomDialogProps {
  onRoomCreated?: (room: DatabaseRoom) => void
  disabled?: boolean
  existingRooms?: DatabaseRoom[]
}

export function AddRoomDialog({
  onRoomCreated,
  disabled = false,
  existingRooms = []
}: AddRoomDialogProps) {
  const [open, setOpen] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if room name already exists (case-insensitive)
  const roomNameExists = (name: string) => {
    return existingRooms.some(
      (room) => room.name.toLowerCase() === name.trim().toLowerCase()
    )
  }

  // Real-time validation
  const validateRoomName = (name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return 'Room name is required'
    }
    if (trimmedName.length < 2) {
      return 'Room name must be at least 2 characters'
    }
    if (trimmedName.length > 50) {
      return 'Room name must be less than 50 characters'
    }
    if (roomNameExists(trimmedName)) {
      return 'A room with this name already exists'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent bubbling to parent form

    // Use the validation function for consistency
    const validationError = validateRoomName(roomName)
    if (validationError) {
      // Don't set error state - validation error is already shown under input
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Use server action instead of API call
      const result = await createRoomAction(
        roomName.trim(),
        description.trim() || undefined
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to create room')
      }

      // Reset form and close dialog
      setRoomName('')
      setDescription('')
      setOpen(false)

      // Notify parent component if callback exists
      if (onRoomCreated && result.room) {
        onRoomCreated(result.room)
      }
    } catch (err) {
      console.error('Error creating room:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create room'
      
      // Don't show duplicate name errors in the bottom error area since they're already shown under the input
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        // The real-time validation will handle this error display
        setError(null)
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset form when closing
      setRoomName('')
      setDescription('')
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="flex items-center gap-2 shrink-0 h-auto min-h-9 px-3 py-2"
        >
          <Plus className="h-4 w-4" />
          Add Room
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Room</DialogTitle>
          <DialogDescription>
            Create a new chat room. Choose a unique name and optional
            description.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="roomName" className="text-sm font-medium">
              Room Name *
            </label>
            <Input
              id="roomName"
              type="text"
              placeholder="e.g., general, random, team-chat"
              value={roomName}
              onChange={(e) => {
                const newValue = e.target.value
                setRoomName(newValue)
                // Clear any previous API errors when user starts typing
                // Validation errors are shown under the input field, not in bottom error area
                setError(null)
              }}
              disabled={loading}
              required
              className={`w-full ${
                roomName.trim() && roomNameExists(roomName) 
                  ? 'border-destructive focus:border-destructive' 
                  : ''
              }`}
            />
            {roomName.trim() && roomNameExists(roomName) && (
              <p className="text-xs text-destructive mt-1">
                A room with this name already exists
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </label>
            <Input
              id="description"
              type="text"
              placeholder="Brief description of the room"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              maxLength={30}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground text-right">
              {description.length}/30 characters
            </div>
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !roomName.trim() || roomNameExists(roomName)}
            >
              {loading ? 'Creating...' : 'Create Room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
