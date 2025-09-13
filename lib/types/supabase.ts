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
          id: number
          channel_id: number
          user_id: string
          message: string | null
          inserted_at: string
        }
        Insert: {
          channel_id: number
          user_id: string
          message?: string | null
        }
        Update: {
          id?: number
          channel_id?: number
          user_id?: string
          message?: string | null
          inserted_at?: string
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
