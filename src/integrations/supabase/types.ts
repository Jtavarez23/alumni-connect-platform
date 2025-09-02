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
      achievement_progress: {
        Row: {
          achievement_key: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          current_value: number | null
          id: string
          target_value: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievement_key: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          target_value: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievement_key?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          target_value?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          admin_id: string | null
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_type: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_type: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_permissions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_types: {
        Row: {
          category: string
          color: string
          created_at: string | null
          description: string
          icon: string
          id: string
          name: string
          rarity: string
          requirement_type: string
          requirement_value: number | null
          title: string
        }
        Insert: {
          category: string
          color?: string
          created_at?: string | null
          description: string
          icon: string
          id?: string
          name: string
          rarity?: string
          requirement_type: string
          requirement_value?: number | null
          title: string
        }
        Update: {
          category?: string
          color?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          name?: string
          rarity?: string
          requirement_type?: string
          requirement_value?: number | null
          title?: string
        }
        Relationships: []
      }
      channel_members: {
        Row: {
          channel_id: string | null
          id: string
          joined_at: string | null
          last_read_at: string | null
          notifications_enabled: boolean | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          channel_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          notifications_enabled?: boolean | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          channel_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          notifications_enabled?: boolean | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "class_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_messages: {
        Row: {
          channel_id: string | null
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
          message_type: string | null
          reactions: Json | null
          reply_to_id: string | null
          sender_id: string | null
          thread_count: number | null
          updated_at: string | null
        }
        Insert: {
          channel_id?: string | null
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string | null
          reactions?: Json | null
          reply_to_id?: string | null
          sender_id?: string | null
          thread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          channel_id?: string | null
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string | null
          reactions?: Json | null
          reply_to_id?: string | null
          sender_id?: string | null
          thread_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "class_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "channel_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_channels: {
        Row: {
          channel_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          graduation_year: number
          id: string
          is_private: boolean | null
          last_message_at: string | null
          member_count: number | null
          name: string
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          channel_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          graduation_year: number
          id?: string
          is_private?: boolean | null
          last_message_at?: string | null
          member_count?: number | null
          name: string
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          channel_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          graduation_year?: number
          id?: string
          is_private?: boolean | null
          last_message_at?: string | null
          member_count?: number | null
          name?: string
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_channels_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      content_moderation: {
        Row: {
          action: string
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          moderated_at: string | null
          moderator_id: string | null
          reason: string | null
        }
        Insert: {
          action: string
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          moderated_at?: string | null
          moderator_id?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          moderated_at?: string | null
          moderator_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_moderation_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_1_id: string
          participant_2_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1_id: string
          participant_2_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1_id?: string
          participant_2_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cross_school_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: string | null
          id: string
          location: string | null
          max_participants: number | null
          name: string
          organizer_school_id: string | null
          participating_schools: string[] | null
          registration_required: boolean | null
          start_date: string
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          max_participants?: number | null
          name: string
          organizer_school_id?: string | null
          participating_schools?: string[] | null
          registration_required?: boolean | null
          start_date: string
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          max_participants?: number | null
          name?: string
          organizer_school_id?: string | null
          participating_schools?: string[] | null
          registration_required?: boolean | null
          start_date?: string
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_school_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_school_events_organizer_school_id_fkey"
            columns: ["organizer_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
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
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          message_type: string | null
          read_at: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string | null
          read_at?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string | null
          read_at?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mystery_game_sessions: {
        Row: {
          clues_revealed: number | null
          completed_at: string | null
          created_at: string | null
          expires_at: string | null
          game_status: string | null
          graduation_year: number
          id: string
          max_clues: number | null
          school_id: string
          score: number | null
          started_at: string | null
          target_user_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          clues_revealed?: number | null
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          game_status?: string | null
          graduation_year: number
          id?: string
          max_clues?: number | null
          school_id: string
          score?: number | null
          started_at?: string | null
          target_user_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          clues_revealed?: number | null
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          game_status?: string | null
          graduation_year?: number
          id?: string
          max_clues?: number | null
          school_id?: string
          score?: number | null
          started_at?: string | null
          target_user_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mystery_game_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      mystery_lookups: {
        Row: {
          clues: Json | null
          created_at: string | null
          expires_at: string | null
          graduation_year: number | null
          id: string
          looker_id: string
          mutual_friends_count: number | null
          revealed: boolean | null
          school_name: string
          target_user_id: string
        }
        Insert: {
          clues?: Json | null
          created_at?: string | null
          expires_at?: string | null
          graduation_year?: number | null
          id?: string
          looker_id: string
          mutual_friends_count?: number | null
          revealed?: boolean | null
          school_name: string
          target_user_id: string
        }
        Update: {
          clues?: Json | null
          created_at?: string | null
          expires_at?: string | null
          graduation_year?: number | null
          id?: string
          looker_id?: string
          mutual_friends_count?: number | null
          revealed?: boolean | null
          school_name?: string
          target_user_id?: string
        }
        Relationships: []
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
          admin_role: string | null
          allow_friend_requests: boolean | null
          allow_messages: boolean | null
          allow_tags: boolean | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string
          email_notifications: boolean | null
          facebook_url: string | null
          first_name: string
          graduation_year: number | null
          id: string
          instagram_url: string | null
          last_name: string
          linkedin_url: string | null
          privacy_level: string | null
          push_notifications: boolean | null
          school_id: string | null
          show_graduation_year: boolean | null
          show_in_search: boolean | null
          show_school: boolean | null
          stripe_customer_id: string | null
          subscription_status: string | null
          updated_at: string | null
          username: string | null
          verification_status: string | null
        }
        Insert: {
          admin_role?: string | null
          allow_friend_requests?: boolean | null
          allow_messages?: boolean | null
          allow_tags?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          email_notifications?: boolean | null
          facebook_url?: string | null
          first_name: string
          graduation_year?: number | null
          id: string
          instagram_url?: string | null
          last_name: string
          linkedin_url?: string | null
          privacy_level?: string | null
          push_notifications?: boolean | null
          school_id?: string | null
          show_graduation_year?: boolean | null
          show_in_search?: boolean | null
          show_school?: boolean | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          username?: string | null
          verification_status?: string | null
        }
        Update: {
          admin_role?: string | null
          allow_friend_requests?: boolean | null
          allow_messages?: boolean | null
          allow_tags?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          email_notifications?: boolean | null
          facebook_url?: string | null
          first_name?: string
          graduation_year?: number | null
          id?: string
          instagram_url?: string | null
          last_name?: string
          linkedin_url?: string | null
          privacy_level?: string | null
          push_notifications?: boolean | null
          school_id?: string | null
          show_graduation_year?: boolean | null
          show_in_search?: boolean | null
          show_school?: boolean | null
          stripe_customer_id?: string | null
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
      reactions: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          reaction_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          reaction_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          reaction_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      school_administrators: {
        Row: {
          appointed_at: string | null
          appointed_by: string | null
          created_at: string | null
          id: string
          permissions: string[] | null
          role: string | null
          school_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          appointed_at?: string | null
          appointed_by?: string | null
          created_at?: string | null
          id?: string
          permissions?: string[] | null
          role?: string | null
          school_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          appointed_at?: string | null
          appointed_by?: string | null
          created_at?: string | null
          id?: string
          permissions?: string[] | null
          role?: string | null
          school_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_administrators_appointed_by_fkey"
            columns: ["appointed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_administrators_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_administrators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_clubs: {
        Row: {
          advisor_name: string | null
          category: string | null
          contact_info: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          founded_year: number | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          meeting_schedule: string | null
          member_count: number | null
          name: string
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          advisor_name?: string | null
          category?: string | null
          contact_info?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          meeting_schedule?: string | null
          member_count?: number | null
          name: string
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          advisor_name?: string | null
          category?: string | null
          contact_info?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          meeting_schedule?: string | null
          member_count?: number | null
          name?: string
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_clubs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_districts: {
        Row: {
          country: string
          created_at: string | null
          district_code: string | null
          id: string
          name: string
          state: string
          superintendent: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          country?: string
          created_at?: string | null
          district_code?: string | null
          id?: string
          name: string
          state: string
          superintendent?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          district_code?: string | null
          id?: string
          name?: string
          state?: string
          superintendent?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      school_history: {
        Row: {
          achievements: string[] | null
          activities: string[] | null
          created_at: string | null
          department: string | null
          end_year: number | null
          grade_level: string | null
          graduated: boolean | null
          id: string
          is_primary: boolean | null
          role_type: string | null
          school_id: string | null
          start_year: number
          transfer_reason: string | null
          updated_at: string | null
          user_id: string | null
          verification_status: string | null
        }
        Insert: {
          achievements?: string[] | null
          activities?: string[] | null
          created_at?: string | null
          department?: string | null
          end_year?: number | null
          grade_level?: string | null
          graduated?: boolean | null
          id?: string
          is_primary?: boolean | null
          role_type?: string | null
          school_id?: string | null
          start_year: number
          transfer_reason?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
        }
        Update: {
          achievements?: string[] | null
          activities?: string[] | null
          created_at?: string | null
          department?: string | null
          end_year?: number | null
          grade_level?: string | null
          graduated?: boolean | null
          id?: string
          is_primary?: boolean | null
          role_type?: string | null
          school_id?: string | null
          start_year?: number
          transfer_reason?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_invitations: {
        Row: {
          created_at: string | null
          expires_at: string | null
          from_school_id: string | null
          id: string
          invitation_type: string | null
          invited_by: string | null
          message: string | null
          responded_at: string | null
          responded_by: string | null
          status: string | null
          to_school_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          from_school_id?: string | null
          id?: string
          invitation_type?: string | null
          invited_by?: string | null
          message?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
          to_school_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          from_school_id?: string | null
          id?: string
          invitation_type?: string | null
          invited_by?: string | null
          message?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
          to_school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_invitations_from_school_id_fkey"
            columns: ["from_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_invitations_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_invitations_to_school_id_fkey"
            columns: ["to_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_partnerships: {
        Row: {
          created_at: string | null
          description: string | null
          established_date: string | null
          id: string
          partnership_type: string | null
          school_1_id: string | null
          school_2_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          established_date?: string | null
          id?: string
          partnership_type?: string | null
          school_1_id?: string | null
          school_2_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          established_date?: string | null
          id?: string
          partnership_type?: string | null
          school_1_id?: string | null
          school_2_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_partnerships_school_1_id_fkey"
            columns: ["school_1_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_partnerships_school_2_id_fkey"
            columns: ["school_2_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_photos: {
        Row: {
          academic_year: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          photo_url: string
          school_id: string | null
          title: string
          updated_at: string | null
          upload_date: string | null
          uploaded_by: string | null
        }
        Insert: {
          academic_year?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          photo_url: string
          school_id?: string | null
          title: string
          updated_at?: string | null
          upload_date?: string | null
          uploaded_by?: string | null
        }
        Update: {
          academic_year?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          photo_url?: string
          school_id?: string | null
          title?: string
          updated_at?: string | null
          upload_date?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_photos_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_verifications: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          school_id: string | null
          user_id: string | null
          verification_data: Json | null
          verification_level: string | null
          verification_type: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          school_id?: string | null
          user_id?: string | null
          verification_data?: Json | null
          verification_level?: string | null
          verification_type?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          school_id?: string | null
          user_id?: string | null
          verification_data?: Json | null
          verification_level?: string | null
          verification_type?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_verifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          accreditation: string[] | null
          address_line_1: string | null
          address_line_2: string | null
          banner_image_url: string | null
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          district_id: string | null
          domain: string | null
          enrollment_size: number | null
          founding_year: number | null
          id: string
          is_public: boolean | null
          location: Json
          mascot: string | null
          name: string
          phone_number: string | null
          principal_name: string | null
          school_colors: string[] | null
          school_level: string | null
          slug: string
          state: string | null
          submission_status: string | null
          submitted_by: string | null
          total_students: number | null
          type: string
          user_submitted: boolean | null
          verified: boolean | null
          website_url: string | null
          zip_code: string | null
        }
        Insert: {
          accreditation?: string[] | null
          address_line_1?: string | null
          address_line_2?: string | null
          banner_image_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          district_id?: string | null
          domain?: string | null
          enrollment_size?: number | null
          founding_year?: number | null
          id?: string
          is_public?: boolean | null
          location: Json
          mascot?: string | null
          name: string
          phone_number?: string | null
          principal_name?: string | null
          school_colors?: string[] | null
          school_level?: string | null
          slug: string
          state?: string | null
          submission_status?: string | null
          submitted_by?: string | null
          total_students?: number | null
          type: string
          user_submitted?: boolean | null
          verified?: boolean | null
          website_url?: string | null
          zip_code?: string | null
        }
        Update: {
          accreditation?: string[] | null
          address_line_1?: string | null
          address_line_2?: string | null
          banner_image_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          district_id?: string | null
          domain?: string | null
          enrollment_size?: number | null
          founding_year?: number | null
          id?: string
          is_public?: boolean | null
          location?: Json
          mascot?: string | null
          name?: string
          phone_number?: string | null
          principal_name?: string | null
          school_colors?: string[] | null
          school_level?: string | null
          slug?: string
          state?: string | null
          submission_status?: string | null
          submitted_by?: string | null
          total_students?: number | null
          type?: string
          user_submitted?: boolean | null
          verified?: boolean | null
          website_url?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "school_districts"
            referencedColumns: ["id"]
          },
        ]
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
      subscription_management: {
        Row: {
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_manual_grant: boolean | null
          notes: string | null
          subscription_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_manual_grant?: boolean | null
          notes?: string | null
          subscription_type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_manual_grant?: boolean | null
          notes?: string | null
          subscription_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_management_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_management_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      then_vs_now_posts: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          now_photo_url: string
          then_photo_url: string
          updated_at: string | null
          user_id: string
          visibility: string | null
          yearbook_entry_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          now_photo_url: string
          then_photo_url: string
          updated_at?: string | null
          user_id: string
          visibility?: string | null
          yearbook_entry_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          now_photo_url?: string
          then_photo_url?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
          yearbook_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_then_vs_now_posts_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "then_vs_now_posts_yearbook_entry_id_fkey"
            columns: ["yearbook_entry_id"]
            isOneToOne: false
            referencedRelation: "yearbook_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_type_id: string
          earned_at: string | null
          id: string
          progress_data: Json | null
          user_id: string
        }
        Insert: {
          badge_type_id: string
          earned_at?: string | null
          id?: string
          progress_data?: Json | null
          user_id: string
        }
        Update: {
          badge_type_id?: string
          earned_at?: string | null
          id?: string
          progress_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_type_id_fkey"
            columns: ["badge_type_id"]
            isOneToOne: false
            referencedRelation: "badge_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_activity_date: string | null
          level: number | null
          longest_streak: number | null
          points: number | null
          total_connections: number | null
          total_messages: number | null
          total_reactions: number | null
          total_tags: number | null
          total_yearbooks_viewed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          longest_streak?: number | null
          points?: number | null
          total_connections?: number | null
          total_messages?: number | null
          total_reactions?: number | null
          total_tags?: number | null
          total_yearbooks_viewed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          longest_streak?: number | null
          points?: number | null
          total_connections?: number | null
          total_messages?: number | null
          total_reactions?: number | null
          total_tags?: number | null
          total_yearbooks_viewed?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      yearbook_party_participants: {
        Row: {
          id: string
          is_online: boolean | null
          joined_at: string | null
          last_seen_at: string | null
          room_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          is_online?: boolean | null
          joined_at?: string | null
          last_seen_at?: string | null
          room_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          is_online?: boolean | null
          joined_at?: string | null
          last_seen_at?: string | null
          room_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yearbook_party_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "yearbook_party_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yearbook_party_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      yearbook_party_rooms: {
        Row: {
          created_at: string | null
          current_page: number | null
          description: string | null
          host_id: string | null
          id: string
          is_active: boolean | null
          max_participants: number | null
          name: string
          updated_at: string | null
          yearbook_edition_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_page?: number | null
          description?: string | null
          host_id?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name: string
          updated_at?: string | null
          yearbook_edition_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_page?: number | null
          description?: string | null
          host_id?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name?: string
          updated_at?: string | null
          yearbook_edition_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yearbook_party_rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yearbook_party_rooms_yearbook_edition_id_fkey"
            columns: ["yearbook_edition_id"]
            isOneToOne: false
            referencedRelation: "yearbook_editions"
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
      calculate_user_level: {
        Args: { points: number }
        Returns: number
      }
      get_current_user_school_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_school_admin: {
        Args: { school_id: string; user_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      update_user_stats_points: {
        Args: { points_to_add: number; user_id: string }
        Returns: undefined
      }
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
