export interface PresenceUser {
  id: string
  name: string
  avatar_url?: string
  online_at?: number
  timestamp?: number
  online?: boolean
}

export type PresenceState = Record<string, PresenceUser>
