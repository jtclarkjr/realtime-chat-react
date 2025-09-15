'use server'

import { getServiceClient } from './service-client'
import { DatabaseRoom, DatabaseRoomInsert } from '@/lib/types/database'

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
    throw new Error('Failed to create room')
  }

  return data
}

export async function ensureDefaultRooms(): Promise<void> {
  const supabase = getServiceClient()

  // Check if "general" room exists
  const { data: generalRoom } = await supabase
    .from('rooms')
    .select('id')
    .eq('name', 'general')
    .single()

  // If general room doesn't exist, create it
  if (!generalRoom) {
    await createRoom({
      name: 'general',
      description: 'General chat room for everyone'
    })
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
