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
import { DatabaseRoom } from '@/lib/types/database'
import { createRoomAction } from '@/lib/actions/room-actions'

interface AddRoomDialogProps {
  onRoomCreated?: (room: DatabaseRoom) => void
  disabled?: boolean
}

export function AddRoomDialog({
  onRoomCreated,
  disabled = false
}: AddRoomDialogProps) {
  const [open, setOpen] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent bubbling to parent form

    if (!roomName.trim()) {
      setError('Room name is required')
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
      setError(err instanceof Error ? err.message : 'Failed to create room')
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
          size="sm"
          disabled={disabled}
          className="flex items-center gap-2 shrink-0"
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
              onChange={(e) => setRoomName(e.target.value)}
              disabled={loading}
              required
              className="w-full"
            />
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
            <Button type="submit" disabled={loading || !roomName.trim()}>
              {loading ? 'Creating...' : 'Create Room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
