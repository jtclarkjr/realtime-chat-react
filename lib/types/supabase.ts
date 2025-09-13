export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      messages: {
        Row: {
          id: string
          room_id: string
          user_id: string
          username: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          username: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          username?: string
          content?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
