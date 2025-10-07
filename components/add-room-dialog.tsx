'use client'

import DOMPurify from 'isomorphic-dompurify'
import { useState } from 'react'
import { track } from '@vercel/analytics/react'
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
import { Plus, Sparkles } from 'lucide-react'
import { useGenerateRoom, useCreateRoom } from '@/lib/query/mutations'
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
  const [open, setOpen] = useState<boolean>(false)
  const [roomName, setRoomName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const generateRoomMutation = useGenerateRoom()
  const createRoomMutation = useCreateRoom()

  // Check if room name already exists (case-insensitive)
  const roomNameExists = (name: string): boolean => {
    return existingRooms.some(
      (room) => room.name.toLowerCase() === name.trim().toLowerCase()
    )
  }

  // Real-time validation
  const validateRoomName = (name: string): string | null => {
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

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation() // Prevent bubbling to parent form

    // Use the validation function for consistency
    const validationError = validateRoomName(roomName)
    if (validationError) {
      // Don't set error state - validation error is already shown under input
      return
    }

    try {
      setError(null)

      // Sanitize inputs before sending to server
      const sanitizedRoomName = DOMPurify.sanitize(roomName.trim())
      const sanitizedDescription = description.trim()
        ? DOMPurify.sanitize(description.trim())
        : undefined

      const result = await createRoomMutation.mutateAsync({
        name: sanitizedRoomName,
        description: sanitizedDescription
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to create room')
      }

      // Reset form and close dialog
      resetForm()
      setOpen(false)

      // Notify parent component if callback exists
      if (result.room && onRoomCreated) {
        onRoomCreated(result.room)
      }
    } catch (err) {
      console.error('Error creating room:', err)
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create room'

      // Don't show duplicate name errors in the bottom error area since they're already shown under the input
      if (
        errorMessage.includes('already exists') ||
        errorMessage.includes('duplicate')
      ) {
        // The real-time validation will handle this error display
        setError(null)
      } else {
        setError(errorMessage)
      }
    }
  }

  const resetForm = (): void => {
    setRoomName('')
    setDescription('')
    setError(null)
  }

  const handleCancel = (): void => {
    resetForm()
    setOpen(false)
  }

  const handleOpenChange = (newOpen: boolean): void => {
    setOpen(newOpen)
    if (!newOpen) {
      resetForm()
    }
  }

  const handleGenerate = async (): Promise<void> => {
    track('event_generate_room_suggestion')
    try {
      setError(null)

      const data = await generateRoomMutation.mutateAsync({
        existingRoomNames: existingRooms.map((room) => room.name),
        currentName: roomName.trim() || undefined,
        currentDescription: description.trim() || undefined
      })

      if (data.suggestion) {
        setRoomName(data.suggestion.name)
        setDescription(data.suggestion.description)
      }
    } catch (err) {
      console.error('Error generating room suggestion:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate room suggestion'
      )
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
            Create a new chat room. Enter your own details, or let AI generate
            suggestions. You can also start typing and use AI to enhance your
            ideas.
          </DialogDescription>
        </DialogHeader>
        <div className="mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerate}
            disabled={
              createRoomMutation.isPending || generateRoomMutation.isPending
            }
            className="w-full flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles
              className={`h-4 w-4 transition-transform duration-500 ${
                generateRoomMutation.isPending ? 'animate-spin' : ''
              }`}
            />
            {generateRoomMutation.isPending
              ? 'Generating...'
              : 'Generate with AI'}
          </Button>
        </div>
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
                setRoomName(e.target.value)
                // Clear any previous API errors when user starts typing
                // Validation errors are shown under the input field, not in bottom error area
                setError(null)
              }}
              disabled={
                createRoomMutation.isPending || generateRoomMutation.isPending
              }
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
              disabled={
                createRoomMutation.isPending || generateRoomMutation.isPending
              }
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
              onClick={handleCancel}
              disabled={
                createRoomMutation.isPending || generateRoomMutation.isPending
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createRoomMutation.isPending ||
                generateRoomMutation.isPending ||
                !roomName.trim() ||
                roomNameExists(roomName)
              }
            >
              {createRoomMutation.isPending ? 'Creating...' : 'Create Room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
