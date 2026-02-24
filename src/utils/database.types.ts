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
      groups: {
        Row: {
          id: string
          leader_id: string
          alert_distance: number
          created_at: string
        }
        Insert: {
          id: string
          leader_id: string
          alert_distance?: number
          created_at?: string
        }
        Update: {
          id?: string
          leader_id?: string
          alert_distance?: number
          created_at?: string
        }
      }
      user_locations: {
        Row: {
          id: string
          group_id: string
          name: string
          icon_url: string | null
          current_lat: number
          current_lng: number
          last_updated: string
        }
        Insert: {
          id: string
          group_id: string
          name: string
          icon_url?: string | null
          current_lat: number
          current_lng: number
          last_updated?: string
        }
        Update: {
          id?: string
          group_id?: string
          name?: string
          icon_url?: string | null
          current_lat?: number
          current_lng?: number
          last_updated?: string
        }
      }
    }
  }
}
