import { getRoomDataWithMessages } from '@/lib/actions/room-actions'
import { RoomClient } from './room-client'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

// No page-level caching since we need user-specific data for private messages
// Room metadata is cached separately in the room-actions.ts
export const revalidate = 0 // Always fetch fresh data for each user to respect privacy

interface RoomPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function RoomPage({ params }: RoomPageProps) {
  // Await params to access its properties
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

  // Extract only the data we need for the client
  const userData = {
    id: user.id,
    username:
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Anonymous User',
    avatarUrl: user.user_metadata?.avatar_url
  }

  // Fetch initial room data and messages server-side with user context for privacy
  const { room, messages } = await getRoomDataWithMessages(id, user.id)

  // If room doesn't exist, show 404
  if (!room) {
    notFound()
  }

  return (
    <section className="md:border-l md:border-r bg-background md:max-w-5xl md:mx-auto">
      <RoomClient room={room} initialMessages={messages} user={userData} />
    </section>
  )
}
