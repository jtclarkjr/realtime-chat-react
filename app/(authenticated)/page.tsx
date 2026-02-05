import { getRoomsWithLastMessage } from '@/lib/actions/room-actions'
import { createClient } from '@/lib/supabase/server'
import { toPublicUser } from '@/lib/auth/public-user'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { WelcomeCard } from '@/components/dashboard/welcome-card'
import { RecentRooms } from '@/components/dashboard/recent-rooms'
import { CreateRoomCard } from '@/components/dashboard/create-room-card'
import { ChannelSearchCard } from '@/components/dashboard/channel-search-card'

// Use ISR for better performance
export const revalidate = 30

export default async function DashboardPage() {
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
  const roomsWithLastMessage = await getRoomsWithLastMessage(user.id)

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8">
        <WelcomeCard user={userData} />
        <CreateRoomCard user={userData} initialRooms={roomsWithLastMessage} />
        <ChannelSearchCard initialRooms={roomsWithLastMessage} />
        <RecentRooms initialRooms={roomsWithLastMessage} />
      </div>
    </div>
  )
}
