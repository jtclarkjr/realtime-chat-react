import { getInitialRoomsData } from '@/lib/actions/room-actions'
import { HomeClient } from './home-client'

// Use ISR for better performance while keeping data fresh
export const revalidate = 30 // Revalidate every 30 seconds

export default async function Home() {
  // Fetch initial room data server-side
  const { rooms, defaultRoomId } = await getInitialRoomsData()

  return (
    <HomeClient initialRooms={rooms} initialDefaultRoomId={defaultRoomId} />
  )
}
