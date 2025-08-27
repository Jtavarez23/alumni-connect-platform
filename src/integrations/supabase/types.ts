export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      friendships: {
        Row: {
          addressee_id: string
          created_at: string | null
          id: string
          requester_id: string
          status: string | null
          updated_at: string | null
          verification_method: string | null
        }
        Insert: {
          addressee_id: string
          created_at?: string | null
          id?: string
          requester_id: string
          status?: string | null
          updated_at?: string | null
          verification_method?: string | null
        }
        Update: {
          addressee_id?: string
          created_at?: string | null
          id?: string
          requester_id?: string
          status?: string | null
          updated_at?: string | null
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          read: boolean | null
          related_entity_id: string | null
          related_user_id: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          related_entity_id?: string | null
          related_user_id?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          related_entity_id?: string | null
          related_user_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string
          first_name: string
          graduation_year: number | null
          id: string
          last_name: string
          privacy_level: string | null
          school_id: string | null
          subscription_status: string | null
          updated_at: string | null
          username: string | null
          verification_status: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          first_name: string
          graduation_year?: number | null
          id: string
          last_name: string
          privacy_level?: string | null
          school_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          username?: string | null
          verification_status?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          graduation_year?: number | null
          id?: string
          last_name?: string
          privacy_level?: string | null
          school_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          username?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string | null
          domain: string | null
          id: string
          location: Json
          name: string
          slug: string
          submission_status: string | null
          submitted_by: string | null
          type: string
          user_submitted: boolean | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          id?: string
          location: Json
          name: string
          slug: string
          submission_status?: string | null
          submitted_by?: string | null
          type: string
          user_submitted?: boolean | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          id?: string
          location?: Json
          name?: string
          slug?: string
          submission_status?: string | null
          submitted_by?: string | null
          type?: string
          user_submitted?: boolean | null
          verified?: boolean | null
        }
        Relationships: []
      }
      student_tags: {
        Row: {
          created_at: string | null
          id: string
          tagged_by_id: string
          tagged_profile_id: string
          updated_at: string | null
          verification_status: string | null
          yearbook_entry_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tagged_by_id: string
          tagged_profile_id: string
          updated_at?: string | null
          verification_status?: string | null
          yearbook_entry_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tagged_by_id?: string
          tagged_profile_id?: string
          updated_at?: string | null
          verification_status?: string | null
          yearbook_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_tags_tagged_by_id_fkey"
            columns: ["tagged_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_tags_tagged_profile_id_fkey"
            columns: ["tagged_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_tags_yearbook_entry_id_fkey"
            columns: ["yearbook_entry_id"]
            isOneToOne: false
            referencedRelation: "yearbook_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_suggestions: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          status: string | null
          suggested_by_id: string | null
          suggested_profile_id: string
          suggestion_type: string | null
          yearbook_entry_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          status?: string | null
          suggested_by_id?: string | null
          suggested_profile_id: string
          suggestion_type?: string | null
          yearbook_entry_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          status?: string | null
          suggested_by_id?: string | null
          suggested_profile_id?: string
          suggestion_type?: string | null
          yearbook_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_suggestions_suggested_by_id_fkey"
            columns: ["suggested_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_suggestions_suggested_profile_id_fkey"
            columns: ["suggested_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_suggestions_yearbook_entry_id_fkey"
            columns: ["yearbook_entry_id"]
            isOneToOne: false
            referencedRelation: "yearbook_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_verifications: {
        Row: {
          created_at: string | null
          id: string
          is_verified: boolean
          student_tag_id: string
          verification_note: string | null
          verification_type: string | null
          verifier_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_verified: boolean
          student_tag_id: string
          verification_note?: string | null
          verification_type?: string | null
          verifier_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_verified?: boolean
          student_tag_id?: string
          verification_note?: string | null
          verification_type?: string | null
          verifier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_verifications_student_tag_id_fkey"
            columns: ["student_tag_id"]
            isOneToOne: false
            referencedRelation: "student_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_verifications_verifier_id_fkey"
            columns: ["verifier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      yearbook_editions: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          id: string
          page_count: number | null
          school_id: string
          title: string | null
          upload_status: string | null
          uploaded_by: string | null
          year: number
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          page_count?: number | null
          school_id: string
          title?: string | null
          upload_status?: string | null
          uploaded_by?: string | null
          year: number
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          page_count?: number | null
          school_id?: string
          title?: string | null
          upload_status?: string | null
          uploaded_by?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "yearbook_editions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      yearbook_entries: {
        Row: {
          activities: string[] | null
          created_at: string | null
          edition_id: string
          honors: string[] | null
          id: string
          page_number: number | null
          photo_url: string | null
          profile_id: string | null
          quote: string | null
          student_name: string
        }
        Insert: {
          activities?: string[] | null
          created_at?: string | null
          edition_id: string
          honors?: string[] | null
          id?: string
          page_number?: number | null
          photo_url?: string | null
          profile_id?: string | null
          quote?: string | null
          student_name: string
        }
        Update: {
          activities?: string[] | null
          created_at?: string | null
          edition_id?: string
          honors?: string[] | null
          id?: string
          page_number?: number | null
          photo_url?: string | null
          profile_id?: string | null
          quote?: string | null
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "yearbook_entries_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "yearbook_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yearbook_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      activity_feed: {
        Row: {
          created_at: string | null
          id: string | null
          message: string | null
          read: boolean | null
          related_user_id: string | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          message?: string | null
          read?: boolean | null
          related_user_id?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          message?: string | null
          read?: boolean | null
          related_user_id?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
