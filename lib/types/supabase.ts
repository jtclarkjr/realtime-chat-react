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
          is_ai_message: boolean
          is_private: boolean
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          username: string
          content: string
          created_at?: string
          is_ai_message?: boolean
          is_private?: boolean
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          username?: string
          content?: string
          created_at?: string
          is_ai_message?: boolean
          is_private?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'messages_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          }
        ]
      }
      rooms: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string | null
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
