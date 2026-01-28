import { getInitialRoomsData } from '@/lib/actions/room-actions'
import { HomeClient } from './home-client'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

// Use ISR for better performance while keeping data fresh
export const revalidate = 30 // Revalidate every 30 seconds

export default async function Home() {
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

  // Fetch initial room data server-side
  const { rooms, defaultRoomId } = await getInitialRoomsData()

  return (
    <HomeClient
      initialRooms={rooms}
      initialDefaultRoomId={defaultRoomId}
      user={userData}
    />
  )
}
