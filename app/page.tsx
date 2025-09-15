import { getInitialRoomsData } from '@/lib/actions/room-actions'
import { HomeClient } from './home-client'

// Force dynamic rendering since we fetch room data from Redis/Upstash
export const dynamic = 'force-dynamic'

export default async function Home() {
  // Fetch initial room data server-side
  const { rooms, defaultRoomId } = await getInitialRoomsData()

  return (
    <HomeClient initialRooms={rooms} initialDefaultRoomId={defaultRoomId} />
  )
}
