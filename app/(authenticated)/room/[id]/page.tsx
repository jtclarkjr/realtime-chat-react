import { getRoomDataWithMessages } from '@/lib/actions/room-actions'
import { RoomClient } from './room-client'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { toPublicUser } from '@/lib/auth/public-user'
import { headers } from 'next/headers'

// No page-level caching since we need user-specific data for private messages
export const revalidate = 0

interface RoomPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { id } = await params

  // Check authentication server-side
  const headersList = await headers()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
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

  const userData = toPublicUser(user)

  // Fetch initial room data and messages server-side
  const { room, messages } = await getRoomDataWithMessages(id, user.id)

  // If room doesn't exist, show 404
  if (!room) {
    notFound()
  }

  return <RoomClient room={room} initialMessages={messages} user={userData} />
}
