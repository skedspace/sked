export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: number
          org_id: string
          payload: Json | null
          target: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: number
          org_id: string
          payload?: Json | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: number
          org_id?: string
          payload?: Json | null
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          assigned_staff_id: string | null
          cancellation_reason: string | null
          created_at: string
          customer_id: string
          id: string
          idempotency_key: string | null
          org_id: string
          price_cents: number
          recurring_rule_id: string | null
          resource_id: string
          service_id: string
          source: string
          status: string
          time_range: unknown
          updated_at: string
        }
        Insert: {
          assigned_staff_id?: string | null
          cancellation_reason?: string | null
          created_at?: string
          customer_id: string
          id?: string
          idempotency_key?: string | null
          org_id: string
          price_cents: number
          recurring_rule_id?: string | null
          resource_id: string
          service_id: string
          source?: string
          status?: string
          time_range: unknown
          updated_at?: string
        }
        Update: {
          assigned_staff_id?: string | null
          cancellation_reason?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          idempotency_key?: string | null
          org_id?: string
          price_cents?: number
          recurring_rule_id?: string | null
          resource_id?: string
          service_id?: string
          source?: string
          status?: string
          time_range?: unknown
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_entries: {
        Row: {
          booking_id: string | null
          campaign_id: string
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          is_winner: boolean
          otp_verified: boolean
          task_id: string | null
          winner_position: number | null
        }
        Insert: {
          booking_id?: string | null
          campaign_id: string
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          is_winner?: boolean
          otp_verified?: boolean
          task_id?: string | null
          winner_position?: number | null
        }
        Update: {
          booking_id?: string | null
          campaign_id?: string
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          is_winner?: boolean
          otp_verified?: boolean
          task_id?: string | null
          winner_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_entries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "campaign_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_otps: {
        Row: {
          created_at: string
          entry_id: string
          expires_at: string
          id: string
          otp: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          entry_id: string
          expires_at: string
          id?: string
          otp: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          entry_id?: string
          expires_at?: string
          id?: string
          otp?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_otps_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "campaign_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_tasks: {
        Row: {
          campaign_id: string
          config: Json | null
          created_at: string
          description: string | null
          entry_count: number
          id: string
          label: string
          type: string
        }
        Insert: {
          campaign_id: string
          config?: Json | null
          created_at?: string
          description?: string | null
          entry_count?: number
          id?: string
          label: string
          type: string
        }
        Update: {
          campaign_id?: string
          config?: Json | null
          created_at?: string
          description?: string | null
          entry_count?: number
          id?: string
          label?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          description: string | null
          draw_block_hash: string | null
          draw_commitment: string | null
          draw_nonce: string | null
          draw_type: string
          ends_at: string
          id: string
          max_entries_per_person: number
          name: string
          org_id: string
          prize: string
          prize_cents: number | null
          starts_at: string
          status: string
          updated_at: string
          winner_count: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          draw_block_hash?: string | null
          draw_commitment?: string | null
          draw_nonce?: string | null
          draw_type?: string
          ends_at: string
          id?: string
          max_entries_per_person?: number
          name: string
          org_id: string
          prize: string
          prize_cents?: number | null
          starts_at?: string
          status?: string
          updated_at?: string
          winner_count?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          draw_block_hash?: string | null
          draw_commitment?: string | null
          draw_nonce?: string | null
          draw_type?: string
          ends_at?: string
          id?: string
          max_entries_per_person?: number
          name?: string
          org_id?: string
          prize?: string
          prize_cents?: number | null
          starts_at?: string
          status?: string
          updated_at?: string
          winner_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_packages: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          org_id: string
          package_id: string
          payment_id: string | null
          sessions_remaining: number
          sessions_total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          org_id: string
          package_id: string
          payment_id?: string | null
          sessions_remaining: number
          sessions_total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          org_id?: string
          package_id?: string
          payment_id?: string | null
          sessions_remaining?: number
          sessions_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_packages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_packages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_packages_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          no_show_count: number
          notes: string | null
          org_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          no_show_count?: number
          notes?: string | null
          org_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          no_show_count?: number
          notes?: string | null
          org_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount_cents: number | null
          max_uses: number | null
          min_cents: number | null
          org_id: string
          starts_at: string
          type: string
          updated_at: string
          value_cents: number | null
          value_percent: number | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_cents?: number | null
          max_uses?: number | null
          min_cents?: number | null
          org_id: string
          starts_at?: string
          type?: string
          updated_at?: string
          value_cents?: number | null
          value_percent?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_cents?: number | null
          max_uses?: number | null
          min_cents?: number | null
          org_id?: string
          starts_at?: string
          type?: string
          updated_at?: string
          value_cents?: number | null
          value_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_events: {
        Row: {
          booking_id: string | null
          created_at: string
          direction: string
          google_event_id: string
          id: string
          status: string
          sync_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          direction: string
          google_event_id: string
          id?: string
          status?: string
          sync_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          direction?: string
          google_event_id?: string
          id?: string
          status?: string
          sync_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_calendar_events_sync_id_fkey"
            columns: ["sync_id"]
            isOneToOne: false
            referencedRelation: "google_calendar_syncs"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_syncs: {
        Row: {
          access_token: string
          calendar_id: string
          created_at: string
          google_email: string
          id: string
          last_synced_at: string | null
          org_id: string
          refresh_token: string
          sync_enabled: boolean
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          calendar_id?: string
          created_at?: string
          google_email: string
          id?: string
          last_synced_at?: string | null
          org_id: string
          refresh_token: string
          sync_enabled?: boolean
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          calendar_id?: string
          created_at?: string
          google_email?: string
          id?: string
          last_synced_at?: string | null
          org_id?: string
          refresh_token?: string
          sync_enabled?: boolean
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_syncs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hour_overrides: {
        Row: {
          closes_at: string | null
          date: string
          id: string
          is_closed: boolean
          location_id: string
          note: string | null
          opens_at: string | null
        }
        Insert: {
          closes_at?: string | null
          date: string
          id?: string
          is_closed?: boolean
          location_id: string
          note?: string | null
          opens_at?: string | null
        }
        Update: {
          closes_at?: string | null
          date?: string
          id?: string
          is_closed?: boolean
          location_id?: string
          note?: string | null
          opens_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hour_overrides_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
          state: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          org_id: string
          state?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          state?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          name: string
          org_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          org_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          org_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          created_at: string
          id: string
          match_id: string
          org_id: string
          player_id: string
          result: string | null
          team: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          org_id: string
          player_id: string
          result?: string | null
          team?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          org_id?: string
          player_id?: string
          result?: string | null
          team?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          match_type: string
          notes: string | null
          org_id: string
          participant_capacity: number
          participant_count: number
          resource_id: string | null
          score: string | null
          service_id: string | null
          starts_at: string
          status: string
          team_a: string
          team_b: string
          title: string
          tournament_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          match_type?: string
          notes?: string | null
          org_id: string
          participant_capacity?: number
          participant_count?: number
          resource_id?: string | null
          score?: string | null
          service_id?: string | null
          starts_at: string
          status?: string
          team_a: string
          team_b: string
          title: string
          tournament_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          match_type?: string
          notes?: string | null
          org_id?: string
          participant_capacity?: number
          participant_count?: number
          resource_id?: string | null
          score?: string | null
          service_id?: string | null
          starts_at?: string
          status?: string
          team_a?: string
          team_b?: string
          title?: string
          tournament_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_usage: {
        Row: {
          bookings_count: number
          created_at: string
          id: string
          month: string
          org_id: string
          updated_at: string
        }
        Insert: {
          bookings_count?: number
          created_at?: string
          id?: string
          month?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          bookings_count?: number
          created_at?: string
          id?: string
          month?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_hours: {
        Row: {
          closes_at: string
          id: string
          is_active: boolean
          location_id: string
          opens_at: string
          weekday: number
        }
        Insert: {
          closes_at: string
          id?: string
          is_active?: boolean
          location_id: string
          opens_at: string
          weekday: number
        }
        Update: {
          closes_at?: string
          id?: string
          is_active?: boolean
          location_id?: string
          opens_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "operating_hours_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          accent_color: string
          address: string | null
          auto_confirmation: boolean
          board_sponsors: Json
          board_tagline: string
          board_title: string
          booking_interval_minutes: number
          booking_window_days: number
          business_type: string
          cancellation_notice_hours: number
          compact_view: boolean
          created_at: string
          currency: string
          dark_mode: boolean
          date_format: string
          default_homepage: string
          default_tab: string
          integration_settings: Json
          items_per_page: number
          language: string
          minimum_notice_minutes: number
          notification_preferences: Json
          number_format: string
          org_id: string
          overlapping_bookings: boolean
          payment_methods: Json
          primary_color: string
          role_settings: Json
          security_settings: Json
          time_format: string
          timezone: string
          updated_at: string
          website: string | null
        }
        Insert: {
          accent_color?: string
          address?: string | null
          auto_confirmation?: boolean
          board_sponsors?: Json
          board_tagline?: string
          board_title?: string
          booking_interval_minutes?: number
          booking_window_days?: number
          business_type?: string
          cancellation_notice_hours?: number
          compact_view?: boolean
          created_at?: string
          currency?: string
          dark_mode?: boolean
          date_format?: string
          default_homepage?: string
          default_tab?: string
          integration_settings?: Json
          items_per_page?: number
          language?: string
          minimum_notice_minutes?: number
          notification_preferences?: Json
          number_format?: string
          org_id: string
          overlapping_bookings?: boolean
          payment_methods?: Json
          primary_color?: string
          role_settings?: Json
          security_settings?: Json
          time_format?: string
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          accent_color?: string
          address?: string | null
          auto_confirmation?: boolean
          board_sponsors?: Json
          board_tagline?: string
          board_title?: string
          booking_interval_minutes?: number
          booking_window_days?: number
          business_type?: string
          cancellation_notice_hours?: number
          compact_view?: boolean
          created_at?: string
          currency?: string
          dark_mode?: boolean
          date_format?: string
          default_homepage?: string
          default_tab?: string
          integration_settings?: Json
          items_per_page?: number
          language?: string
          minimum_notice_minutes?: number
          notification_preferences?: Json
          number_format?: string
          org_id?: string
          overlapping_bookings?: boolean
          payment_methods?: Json
          primary_color?: string
          role_settings?: Json
          security_settings?: Json
          time_format?: string
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          booking_limit_monthly: number
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          deleted_at: string | null
          id: string
          logo_url: string | null
          name: string
          plan: string
          resource_limit: number
          slug: string
          subdomain: string | null
          updated_at: string
        }
        Insert: {
          booking_limit_monthly?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          plan?: string
          resource_limit?: number
          slug: string
          subdomain?: string | null
          updated_at?: string
        }
        Update: {
          booking_limit_monthly?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          plan?: string
          resource_limit?: number
          slug?: string
          subdomain?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      package_redemptions: {
        Row: {
          booking_id: string
          created_at: string
          customer_package_id: string
          id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          customer_package_id: string
          id?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          customer_package_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_redemptions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_redemptions_customer_package_id_fkey"
            columns: ["customer_package_id"]
            isOneToOne: false
            referencedRelation: "customer_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number | null
          id: string
          is_active: boolean
          name: string
          org_id: string
          price_cents: number
          service_id: string | null
          session_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          price_cents: number
          service_id?: string | null
          session_count: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          price_cents?: number
          service_id?: string | null
          session_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          bio: string | null
          cover_url: string | null
          created_at: string
          is_published: boolean
          logo_url: string | null
          org_id: string
          primary_color: string | null
          sections: Json
          socials: Json | null
          theme: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          is_published?: boolean
          logo_url?: string | null
          org_id: string
          primary_color?: string | null
          sections?: Json
          socials?: Json | null
          theme?: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          is_published?: boolean
          logo_url?: string | null
          org_id?: string
          primary_color?: string | null
          sections?: Json
          socials?: Json | null
          theme?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          booking_id: string | null
          category: string
          created_at: string
          customer_id: string | null
          description: string | null
          id: string
          org_id: string | null
          payment_method: string | null
          provider: string
          provider_ref: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          booking_id?: string | null
          category?: string
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          org_id?: string | null
          payment_method?: string | null
          provider: string
          provider_ref: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string | null
          category?: string
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          org_id?: string | null
          payment_method?: string | null
          provider?: string
          provider_ref?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          birthday: string | null
          created_at: string
          customer_id: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          org_id: string
          phone: string | null
          play_style: string
          skill_level: number
          status: string
          updated_at: string
        }
        Insert: {
          birthday?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          play_style?: string
          skill_level?: number
          status?: string
          updated_at?: string
        }
        Update: {
          birthday?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          play_style?: string
          skill_level?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_rules: {
        Row: {
          created_at: string
          customer_id: string
          day_of_month: number | null
          day_of_week: number | null
          end_date: string | null
          end_time: string
          frequency: string
          id: string
          is_active: boolean
          max_occurrences: number | null
          occurrences_created: number
          org_id: string
          resource_id: string
          service_id: string
          start_date: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          day_of_month?: number | null
          day_of_week?: number | null
          end_date?: string | null
          end_time: string
          frequency?: string
          id?: string
          is_active?: boolean
          max_occurrences?: number | null
          occurrences_created?: number
          org_id: string
          resource_id: string
          service_id: string
          start_date: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          day_of_month?: number | null
          day_of_week?: number | null
          end_date?: string | null
          end_time?: string
          frequency?: string
          id?: string
          is_active?: boolean
          max_occurrences?: number | null
          occurrences_created?: number
          org_id?: string
          resource_id?: string
          service_id?: string
          start_date?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          capacity: number
          created_at: string
          id: string
          is_active: boolean
          location_id: string
          name: string
          org_id: string
          photo_url: string | null
          type: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          org_id: string
          photo_url?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          org_id?: string
          photo_url?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string
          booking_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          org_id: string
          rating: number
          resource_id: string | null
          response: string | null
          reviewed_at: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          booking_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          org_id: string
          rating: number
          resource_id?: string | null
          response?: string | null
          reviewed_at?: string
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          booking_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          org_id?: string
          rating?: number
          resource_id?: string | null
          response?: string | null
          reviewed_at?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      service_resources: {
        Row: {
          resource_id: string
          service_id: string
        }
        Insert: {
          resource_id: string
          service_id: string
        }
        Update: {
          resource_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_resources_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          buffer_after_min: number
          buffer_before_min: number
          created_at: string
          deposit_cents: number | null
          duration_min: number
          id: string
          is_active: boolean
          max_advance_days: number
          min_notice_min: number
          name: string
          org_id: string
          payment_mode: string
          price_cents: number
          service_category: string | null
          updated_at: string
        }
        Insert: {
          buffer_after_min?: number
          buffer_before_min?: number
          created_at?: string
          deposit_cents?: number | null
          duration_min: number
          id?: string
          is_active?: boolean
          max_advance_days?: number
          min_notice_min?: number
          name: string
          org_id: string
          payment_mode?: string
          price_cents: number
          service_category?: string | null
          updated_at?: string
        }
        Update: {
          buffer_after_min?: number
          buffer_before_min?: number
          created_at?: string
          deposit_cents?: number | null
          duration_min?: number
          id?: string
          is_active?: boolean
          max_advance_days?: number
          min_notice_min?: number
          name?: string
          org_id?: string
          payment_mode?: string
          price_cents?: number
          service_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      share_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          org_id: string
          session_id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          org_id: string
          session_id: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          org_id?: string
          session_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_tokens_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_tokens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          org_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          org_id: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          org_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          subscription_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          subscription_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          org_id: string
          plan: string
          status: string
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          org_id: string
          plan: string
          status?: string
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          org_id?: string
          plan?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          current_round: string | null
          description: string | null
          ends_at: string
          entry_fee_cents: number
          format: string
          id: string
          max_participants: number
          name: string
          org_id: string
          participant_count: number
          skill_level: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_round?: string | null
          description?: string | null
          ends_at: string
          entry_fee_cents?: number
          format?: string
          id?: string
          max_participants?: number
          name: string
          org_id: string
          participant_count?: number
          skill_level?: string | null
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_round?: string | null
          description?: string | null
          ends_at?: string
          entry_fee_cents?: number
          format?: string
          id?: string
          max_participants?: number
          name?: string
          org_id?: string
          participant_count?: number
          skill_level?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          desired_date: string
          desired_start_time: string
          id: string
          notified_at: string | null
          org_id: string
          resource_id: string
          service_id: string
          status: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          desired_date: string
          desired_start_time: string
          id?: string
          notified_at?: string | null
          org_id: string
          resource_id: string
          service_id: string
          status?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          desired_date?: string
          desired_start_time?: string
          id?: string
          notified_at?: string | null
          org_id?: string
          resource_id?: string
          service_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_discount_code: {
        Args: { p_amount_cents: number; p_code: string; p_org_id: string }
        Returns: {
          discount_cents: number
          discount_id: string
          final_cents: number
          message: string
          valid: boolean
        }[]
      }
      can_create_booking: {
        Args: { p_org_id: string }
        Returns: {
          allowed: boolean
          reason: string
        }[]
      }
      generate_recurring_bookings: {
        Args: { p_rule_id: string }
        Returns: number
      }
      get_available_slots: {
        Args: { p_date: string; p_org_slug: string; p_service_id: string }
        Returns: {
          end_time: string
          resource_id: string
          resource_name: string
          start_time: string
        }[]
      }
      get_config: { Args: { p_key: string }; Returns: string }
      get_customer_packages: {
        Args: { p_customer_id: string; p_org_id: string }
        Returns: {
          expires_at: string
          id: string
          package_name: string
          sessions_remaining: number
          sessions_total: number
        }[]
      }
      get_public_page: {
        Args: { page_slug: string }
        Returns: {
          bio: string
          cover_url: string
          google_review_url: string
          is_published: boolean
          logo_url: string
          org_id: string
          org_name: string
          org_slug: string
          plan: string
          primary_color: string
          sections: Json
          services: Json
          socials: Json
          theme: string
        }[]
      }
      increment_usage: {
        Args: { p_month?: string; p_org_id: string }
        Returns: undefined
      }
      notify_waitlist_for_slot: {
        Args: {
          p_desired_date: string
          p_desired_start_time: string
          p_org_id: string
          p_resource_id: string
          p_service_id: string
        }
        Returns: {
          customer_email: string
          customer_name: string
          customer_phone: string
          entry_id: string
        }[]
      }
      redeem_package_session: {
        Args: { p_booking_id: string; p_customer_package_id: string }
        Returns: boolean
      }
      set_config: {
        Args: { p_description?: string; p_key: string; p_value: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

