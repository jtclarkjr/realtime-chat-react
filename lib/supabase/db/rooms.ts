'use server'

import { getServiceClient } from '@/lib/supabase/server/service-client'
import type { DatabaseRoom, DatabaseRoomInsert } from '@/lib/types/database'

export async function getRooms(): Promise<DatabaseRoom[]> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching rooms:', error)
    throw new Error('Failed to fetch rooms')
  }

  return data || []
}

export async function createRoom(
  roomData: DatabaseRoomInsert
): Promise<DatabaseRoom> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('rooms')
    .insert(roomData)
    .select()
    .single()

  if (error) {
    console.error('Error creating room:', error)
    // Pass through specific database error information
    if (error.code === '23505' && error.message?.includes('duplicate key')) {
      throw new Error(`A room with this name already exists`)
    }
    throw new Error(
      `Failed to create room: ${error.message || error.code || 'Unknown error'}`
    )
  }

  return data
}

export async function ensureDefaultRooms(): Promise<void> {
  const supabase = getServiceClient()

  try {
    // Check if "general" room exists
    const { data: generalRoom, error: fetchError } = await supabase
      .from('rooms')
      .select('id')
      .eq('name', 'general')
      .single()

    // If there's an error but it's not "no rows" error, log it
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking for general room:', fetchError)
      return
    }

    // If general room doesn't exist, create it
    if (!generalRoom) {
      try {
        await createRoom({
          name: 'general',
          description: 'General chat room for everyone'
        })
      } catch (createError) {
        // If it's a duplicate key error, that's fine - room already exists
        if (
          createError instanceof Error &&
          createError.message.includes('already exists')
        ) {
          console.log('General room already exists, skipping creation')
        } else {
          throw createError
        }
      }
    }
  } catch (error) {
    console.error('Error in ensureDefaultRooms:', error)
    // Don't throw here - failing to create default rooms shouldn't break the app
  }
}

export async function getRoomById(id: string): Promise<DatabaseRoom | null> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching room by id:', error)
    return null
  }

  return data
}

export async function deleteRoom(
  roomId: string,
  userId: string
): Promise<boolean> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId)
    .eq('created_by', userId)
    .select('id')

  if (error) {
    console.error('Error deleting room:', error)
    // Check if it's an authorization error
    if (error.code === '42501' || error.message?.includes('permission')) {
      throw new Error('unauthorized')
    }
    throw new Error(
      `Failed to delete room: ${error.message || 'Unknown error'}`
    )
  }

  return (data?.length || 0) > 0
}
