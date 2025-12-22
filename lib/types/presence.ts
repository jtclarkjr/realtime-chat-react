export interface PresenceUser {
  id: string
  name: string
  avatar_url?: string
  online_at?: number
}

export type PresenceState = Record<string, PresenceUser>
