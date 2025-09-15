import { getInitialRoomsData } from '@/lib/actions/room-actions'
import { HomeClient } from './home-client'

export default async function Home() {
  // Fetch initial room data server-side
  const { rooms, defaultRoomId } = await getInitialRoomsData()

  return (
    <HomeClient initialRooms={rooms} initialDefaultRoomId={defaultRoomId} />
  )
}
