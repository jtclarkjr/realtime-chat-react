import { getServiceClient } from '@/lib/supabase/server/service-client'
import type {
  DatabaseMessage,
  DatabaseMessageInsert,
  LatestVisibleMessage,
  SupabaseServerClient,
  UnsendMessageRequest
} from '@/lib/types/database'

export async function fetchRecentMessagesForRoom(
  roomId: string,
  userId?: string,
  limit: number = 50
): Promise<DatabaseMessage[]> {
  const supabase = getServiceClient()

  let query = supabase
    .from('messages')
    .select('*')
    .eq('room_id', roomId)
    .is('deleted_at', null)

  if (userId) {
    query = query.or(
      `is_private.eq.false,and(is_private.eq.true,requester_id.eq.${userId}),and(is_private.eq.true,user_id.eq.${userId})`
    )
  } else {
    query = query.eq('is_private', false)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return data || []
}

export async function fetchMessagesAfterTimestamp(
  roomId: string,
  userId: string,
  lastMessageTimestamp: string
): Promise<DatabaseMessage[]> {
  const supabase = getServiceClient()

  let query = supabase
    .from('messages')
    .select('*')
    .eq('room_id', roomId)
    .is('deleted_at', null)
    .gt('created_at', lastMessageTimestamp)

  query = query.or(
    `is_private.eq.false,and(is_private.eq.true,requester_id.eq.${userId}),and(is_private.eq.true,user_id.eq.${userId})`
  )

  const { data, error } = await query.order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return data || []
}

export async function fetchLatestMessagesByRoomBatch(
  roomIds: string[],
  userId: string | undefined,
  offset: number,
  batchSize: number
): Promise<LatestVisibleMessage[]> {
  const supabase = getServiceClient()

  let query = supabase
    .from('messages')
    .select(
      'room_id, content, created_at, user_id, is_ai_message, is_private, requester_id, deleted_at'
    )
    .in('room_id', roomIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + batchSize - 1)

  if (userId) {
    query = query.or(
      `is_private.eq.false,and(is_private.eq.true,requester_id.eq.${userId}),and(is_private.eq.true,user_id.eq.${userId})`
    )
  } else {
    query = query.eq('is_private', false)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  return (data || []) as LatestVisibleMessage[]
}

export async function fetchLatestMessageForRoom(
  roomId: string,
  userId?: string
): Promise<LatestVisibleMessage | null> {
  const supabase = getServiceClient()

  let query = supabase
    .from('messages')
    .select(
      'room_id, content, created_at, user_id, is_ai_message, is_private, requester_id, deleted_at'
    )
    .eq('room_id', roomId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (userId) {
    query = query.or(
      `is_private.eq.false,and(is_private.eq.true,requester_id.eq.${userId}),and(is_private.eq.true,user_id.eq.${userId})`
    )
  } else {
    query = query.eq('is_private', false)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  return (data?.[0] as LatestVisibleMessage | undefined) || null
}

export async function insertMessage(
  messageInsert: DatabaseMessageInsert
): Promise<DatabaseMessage> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('messages')
    .insert(messageInsert)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function setMessageHasAIResponse(
  messageId: string
): Promise<void> {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from('messages')
    .update({ has_ai_response: true })
    .eq('id', messageId)

  if (error) {
    throw error
  }
}

export async function getUserDisplayNameById(
  supabase: SupabaseServerClient,
  userId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('get_user_display_name', {
    user_uuid: userId
  })

  if (error) {
    throw error
  }

  return data || 'Unknown User'
}

export async function getMessageTimestampById(
  supabase: SupabaseServerClient,
  messageId: string
): Promise<string> {
  const { data: message } = await supabase
    .from('messages')
    .select('created_at')
    .eq('id', messageId)
    .single()

  return message?.created_at || new Date(0).toISOString()
}

export async function softDeleteMessage(
  authenticatedClient: SupabaseServerClient,
  request: UnsendMessageRequest
): Promise<DatabaseMessage | null> {
  const { data, error } = await authenticatedClient
    .from('messages')
    .update({
      deleted_at: 'now()',
      deleted_by: request.userId
    })
    .eq('id', request.messageId)
    .eq('room_id', request.roomId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data || null
}
