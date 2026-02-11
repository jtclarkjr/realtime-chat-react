import { RoomClient } from './room-client'

interface RoomPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { id } = await params
  return <RoomClient roomId={id} />
}
