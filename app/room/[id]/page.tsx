import { getRoomDataWithMessages } from '@/lib/actions/room-actions'
import { RoomClient } from './room-client'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

interface RoomPageProps {
  params: {
    id: string
  }
}

export default async function RoomPage({ params }: RoomPageProps) {
  // Check authentication server-side
  const headersList = await headers()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
  const request = new Request(baseUrl, {
    headers: Object.fromEntries(headersList.entries())
  })
  const { supabase } = createClient(request)
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch initial room data and messages server-side
  const { room, messages } = await getRoomDataWithMessages(params.id)

  // If room doesn't exist, show 404
  if (!room) {
    notFound()
  }

  return <RoomClient room={room} initialMessages={messages} user={user} />
}
