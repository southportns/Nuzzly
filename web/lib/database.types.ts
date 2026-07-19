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
    PostgrestVersion: "14.5"
  }
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
      agent_decision_log: {
        Row: {
          agent_name: string
          confidence: number | null
          created_at: string
          duration_ms: number | null
          id: string
          input_state: Json
          output_state: Json
          trace_id: string
        }
        Insert: {
          agent_name: string
          confidence?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          input_state?: Json
          output_state?: Json
          trace_id: string
        }
        Update: {
          agent_name?: string
          confidence?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          input_state?: Json
          output_state?: Json
          trace_id?: string
        }
        Relationships: []
      }
      ai_health_reports: {
        Row: {
          anomaly_snapshot: Json | null
          causes: Json | null
          completion_tokens: number | null
          created_at: string
          date_range: string
          generated_at: string
          id: string
          metrics_snapshot: Json | null
          model_used: string | null
          monitoring_plan: string | null
          pet_id: string
          processing_time_ms: number | null
          prompt_tokens: number | null
          recommendations: Json | null
          report_date: string
          risk_level: Database["public"]["Enums"]["risk_level_t"]
          summary_snapshot: Json | null
          summary_text: string
        }
        Insert: {
          anomaly_snapshot?: Json | null
          causes?: Json | null
          completion_tokens?: number | null
          created_at?: string
          date_range?: string
          generated_at?: string
          id?: string
          metrics_snapshot?: Json | null
          model_used?: string | null
          monitoring_plan?: string | null
          pet_id: string
          processing_time_ms?: number | null
          prompt_tokens?: number | null
          recommendations?: Json | null
          report_date: string
          risk_level?: Database["public"]["Enums"]["risk_level_t"]
          summary_snapshot?: Json | null
          summary_text: string
        }
        Update: {
          anomaly_snapshot?: Json | null
          causes?: Json | null
          completion_tokens?: number | null
          created_at?: string
          date_range?: string
          generated_at?: string
          id?: string
          metrics_snapshot?: Json | null
          model_used?: string | null
          monitoring_plan?: string | null
          pet_id?: string
          processing_time_ms?: number | null
          prompt_tokens?: number | null
          recommendations?: Json | null
          report_date?: string
          risk_level?: Database["public"]["Enums"]["risk_level_t"]
          summary_snapshot?: Json | null
          summary_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_health_reports_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_health_reports_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          confidence_score: number | null
          created_at: string
          detail: string | null
          embedding: string | null
          expires_at: string | null
          generated_at: string
          id: string
          insight_type: Database["public"]["Enums"]["insight_type_t"]
          is_published: boolean
          metadata: Json | null
          product_id: string | null
          source_metrics: Json | null
          source_reviews: string[] | null
          summary: string
          title: string | null
          version: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          detail?: string | null
          embedding?: string | null
          expires_at?: string | null
          generated_at?: string
          id?: string
          insight_type: Database["public"]["Enums"]["insight_type_t"]
          is_published?: boolean
          metadata?: Json | null
          product_id?: string | null
          source_metrics?: Json | null
          source_reviews?: string[] | null
          summary: string
          title?: string | null
          version?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          detail?: string | null
          embedding?: string | null
          expires_at?: string | null
          generated_at?: string
          id?: string
          insight_type?: Database["public"]["Enums"]["insight_type_t"]
          is_published?: boolean
          metadata?: Json | null
          product_id?: string | null
          source_metrics?: Json | null
          source_reviews?: string[] | null
          summary?: string
          title?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "ai_insights_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_type: string
          metrics_generated: number | null
          pet_id: string | null
          records_processed: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type: string
          metrics_generated?: number | null
          pet_id?: string | null
          records_processed?: number | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string
          metrics_generated?: number | null
          pet_id?: string | null
          records_processed?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_jobs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_jobs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
        ]
      }
      breed_aliases: {
        Row: {
          alias: string
          canonical: string
          species: string
        }
        Insert: {
          alias: string
          canonical: string
          species?: string
        }
        Update: {
          alias?: string
          canonical?: string
          species?: string
        }
        Relationships: []
      }
      causal_event_chains: {
        Row: {
          causal_strength: number | null
          chain_name: string
          chain_type: string
          confidence: number | null
          created_at: string
          events: Json
          id: string
          is_causal: boolean | null
          metadata: Json | null
          pet_id: string
          updated_at: string
        }
        Insert: {
          causal_strength?: number | null
          chain_name: string
          chain_type: string
          confidence?: number | null
          created_at?: string
          events?: Json
          id?: string
          is_causal?: boolean | null
          metadata?: Json | null
          pet_id: string
          updated_at?: string
        }
        Update: {
          causal_strength?: number | null
          chain_name?: string
          chain_type?: string
          confidence?: number | null
          created_at?: string
          events?: Json
          id?: string
          is_causal?: boolean | null
          metadata?: Json | null
          pet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "causal_event_chains_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "causal_event_chains_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          breed: string | null
          content: string
          created_at: string
          id: string
          images: string[] | null
          ip_address: string | null
          is_deleted: boolean
          likes_count: number | null
          pet_type: string | null
          profile_id: string
          reject_reason: string | null
          review_status: Database["public"]["Enums"]["community_review_status_t"]
        }
        Insert: {
          breed?: string | null
          content: string
          created_at?: string
          id?: string
          images?: string[] | null
          ip_address?: string | null
          is_deleted?: boolean
          likes_count?: number | null
          pet_type?: string | null
          profile_id: string
          reject_reason?: string | null
          review_status?: Database["public"]["Enums"]["community_review_status_t"]
        }
        Update: {
          breed?: string | null
          content?: string
          created_at?: string
          id?: string
          images?: string[] | null
          ip_address?: string | null
          is_deleted?: boolean
          likes_count?: number | null
          pet_type?: string | null
          profile_id?: string
          reject_reason?: string | null
          review_status?: Database["public"]["Enums"]["community_review_status_t"]
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reports: {
        Row: {
          category: Database["public"]["Enums"]["community_report_category_t"]
          created_at: string
          id: string
          post_id: string
          reason: string
          reporter_id: string | null
          status: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["community_report_category_t"]
          created_at?: string
          id?: string
          post_id: string
          reason: string
          reporter_id?: string | null
          status?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["community_report_category_t"]
          created_at?: string
          id?: string
          post_id?: string
          reason?: string
          reporter_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_summary: {
        Row: {
          anomaly_flags: Json | null
          created_at: string
          date: string
          generated_at: string
          id: string
          metrics_snapshot: Json | null
          pet_id: string
          risk_level: Database["public"]["Enums"]["risk_level_t"]
          summary_text: string | null
        }
        Insert: {
          anomaly_flags?: Json | null
          created_at?: string
          date: string
          generated_at?: string
          id?: string
          metrics_snapshot?: Json | null
          pet_id: string
          risk_level?: Database["public"]["Enums"]["risk_level_t"]
          summary_text?: string | null
        }
        Update: {
          anomaly_flags?: Json | null
          created_at?: string
          date?: string
          generated_at?: string
          id?: string
          metrics_snapshot?: Json | null
          pet_id?: string
          risk_level?: Database["public"]["Enums"]["risk_level_t"]
          summary_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_summary_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_summary_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_task_logs: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          pet_id: string
          profile_id: string
          skipped: boolean
          task_date: string
          task_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          pet_id: string
          profile_id: string
          skipped?: boolean
          task_date: string
          task_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          pet_id?: string
          profile_id?: string
          skipped?: boolean
          task_date?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_task_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_task_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_task_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_task_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_task_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "daily_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_tasks: {
        Row: {
          category: Database["public"]["Enums"]["daily_task_category_t"]
          created_at: string
          custom_days: number | null
          frequency: Database["public"]["Enums"]["daily_task_frequency_t"]
          icon: string | null
          id: string
          is_active: boolean
          is_builtin: boolean
          pet_id: string
          profile_id: string
          reminder_enabled: boolean
          reminder_time: string | null
          sort_order: number
          title: string
          updated_at: string
          weight: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["daily_task_category_t"]
          created_at?: string
          custom_days?: number | null
          frequency?: Database["public"]["Enums"]["daily_task_frequency_t"]
          icon?: string | null
          id?: string
          is_active?: boolean
          is_builtin?: boolean
          pet_id: string
          profile_id: string
          reminder_enabled?: boolean
          reminder_time?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          weight?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["daily_task_category_t"]
          created_at?: string
          custom_days?: number | null
          frequency?: Database["public"]["Enums"]["daily_task_frequency_t"]
          icon?: string | null
          id?: string
          is_active?: boolean
          is_builtin?: boolean
          pet_id?: string
          profile_id?: string
          reminder_enabled?: boolean
          reminder_time?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_tasks_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_tasks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_tasks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_trust_scores: {
        Row: {
          calculated_at: string
          confidence_score: number | null
          entity_id: string
          entity_type: string
          factor_scores: Json | null
          has_long_term_data: boolean | null
          has_photos: boolean | null
          has_voucher: boolean | null
          id: string
          is_anomaly: boolean | null
          is_continuous: boolean | null
          suspicious_level: number | null
          trust_score: number
        }
        Insert: {
          calculated_at?: string
          confidence_score?: number | null
          entity_id: string
          entity_type: string
          factor_scores?: Json | null
          has_long_term_data?: boolean | null
          has_photos?: boolean | null
          has_voucher?: boolean | null
          id?: string
          is_anomaly?: boolean | null
          is_continuous?: boolean | null
          suspicious_level?: number | null
          trust_score: number
        }
        Update: {
          calculated_at?: string
          confidence_score?: number | null
          entity_id?: string
          entity_type?: string
          factor_scores?: Json | null
          has_long_term_data?: boolean | null
          has_photos?: boolean | null
          has_voucher?: boolean | null
          id?: string
          is_anomaly?: boolean | null
          is_continuous?: boolean | null
          suspicious_level?: number | null
          trust_score?: number
        }
        Relationships: []
      }
      diet_logs: {
        Row: {
          created_at: string
          food_name: string
          food_type: string
          id: string
          logged_date: string
          notes: string | null
          pet_id: string
          product_id: string | null
          profile_id: string
        }
        Insert: {
          created_at?: string
          food_name: string
          food_type?: string
          id?: string
          logged_date?: string
          notes?: string | null
          pet_id: string
          product_id?: string | null
          profile_id: string
        }
        Update: {
          created_at?: string
          food_name?: string
          food_type?: string
          id?: string
          logged_date?: string
          notes?: string | null
          pet_id?: string
          product_id?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "diet_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      environment_profiles: {
        Row: {
          activity_level: Database["public"]["Enums"]["activity_level_t"] | null
          city: string | null
          climate_type: Database["public"]["Enums"]["climate_type_t"] | null
          created_at: string
          district: string | null
          has_children: boolean | null
          id: string
          indoor_outdoor: string | null
          living_space: string | null
          metadata: Json | null
          multi_pet_household: boolean | null
          pet_count: number | null
          pet_id: string
          profile_id: string
          region: string | null
          updated_at: string
          water_source: string | null
        }
        Insert: {
          activity_level?:
            | Database["public"]["Enums"]["activity_level_t"]
            | null
          city?: string | null
          climate_type?: Database["public"]["Enums"]["climate_type_t"] | null
          created_at?: string
          district?: string | null
          has_children?: boolean | null
          id?: string
          indoor_outdoor?: string | null
          living_space?: string | null
          metadata?: Json | null
          multi_pet_household?: boolean | null
          pet_count?: number | null
          pet_id: string
          profile_id: string
          region?: string | null
          updated_at?: string
          water_source?: string | null
        }
        Update: {
          activity_level?:
            | Database["public"]["Enums"]["activity_level_t"]
            | null
          city?: string | null
          climate_type?: Database["public"]["Enums"]["climate_type_t"] | null
          created_at?: string
          district?: string | null
          has_children?: boolean | null
          id?: string
          indoor_outdoor?: string | null
          living_space?: string | null
          metadata?: Json | null
          multi_pet_household?: boolean | null
          pet_count?: number | null
          pet_id?: string
          profile_id?: string
          region?: string | null
          updated_at?: string
          water_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "environment_profiles_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environment_profiles_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environment_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environment_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_store: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          causation_id: string | null
          correlation_id: string
          created_at: string
          decision_id: string | null
          event_id: string
          event_type: string
          global_sequence: number
          metadata: Json
          payload: Json
          stream_version: number
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          causation_id?: string | null
          correlation_id: string
          created_at?: string
          decision_id?: string | null
          event_id?: string
          event_type: string
          global_sequence?: number
          metadata?: Json
          payload?: Json
          stream_version?: number
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          causation_id?: string | null
          correlation_id?: string
          created_at?: string
          decision_id?: string | null
          event_id?: string
          event_type?: string
          global_sequence?: number
          metadata?: Json
          payload?: Json
          stream_version?: number
        }
        Relationships: []
      }
      feedback_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          product_id: string | null
          profile_id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          profile_id: string
          source?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          profile_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "feedback_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_usage_periods: {
        Row: {
          created_at: string
          daily_amount: string | null
          end_date: string | null
          feeding_frequency: number | null
          id: string
          is_current: boolean | null
          outcome_summary: string | null
          pet_id: string
          product_id: string
          product_version_id: string | null
          profile_id: string
          stability_score: number | null
          start_date: string
          switch_reason: string | null
          updated_at: string
          would_continue: boolean | null
        }
        Insert: {
          created_at?: string
          daily_amount?: string | null
          end_date?: string | null
          feeding_frequency?: number | null
          id?: string
          is_current?: boolean | null
          outcome_summary?: string | null
          pet_id: string
          product_id: string
          product_version_id?: string | null
          profile_id: string
          stability_score?: number | null
          start_date: string
          switch_reason?: string | null
          updated_at?: string
          would_continue?: boolean | null
        }
        Update: {
          created_at?: string
          daily_amount?: string | null
          end_date?: string | null
          feeding_frequency?: number | null
          id?: string
          is_current?: boolean | null
          outcome_summary?: string | null
          pet_id?: string
          product_id?: string
          product_version_id?: string | null
          profile_id?: string
          stability_score?: number | null
          start_date?: string
          switch_reason?: string | null
          updated_at?: string
          would_continue?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "food_usage_periods_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_usage_periods_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_usage_periods_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "food_usage_periods_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_usage_periods_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_usage_periods_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_usage_periods_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_chat_sessions: {
        Row: {
          ai_response: string
          context_snapshot: Json | null
          created_at: string
          id: string
          model_used: string | null
          pet_id: string
          profile_id: string
          report_id: string | null
          user_message: string
        }
        Insert: {
          ai_response: string
          context_snapshot?: Json | null
          created_at?: string
          id?: string
          model_used?: string | null
          pet_id: string
          profile_id: string
          report_id?: string | null
          user_message: string
        }
        Update: {
          ai_response?: string
          context_snapshot?: Json | null
          created_at?: string
          id?: string
          model_used?: string | null
          pet_id?: string
          profile_id?: string
          report_id?: string | null
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_chat_sessions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_chat_sessions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_chat_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_chat_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_chat_sessions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "ai_health_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      health_memory: {
        Row: {
          created_at: string
          description: string | null
          first_observed: string
          id: string
          is_active: boolean | null
          last_observed: string
          memory_type: string
          occurrence_count: number | null
          pet_id: string
          related_metrics: Json | null
          severity: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          first_observed: string
          id?: string
          is_active?: boolean | null
          last_observed: string
          memory_type: string
          occurrence_count?: number | null
          pet_id: string
          related_metrics?: Json | null
          severity?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          first_observed?: string
          id?: string
          is_active?: boolean | null
          last_observed?: string
          memory_type?: string
          occurrence_count?: number | null
          pet_id?: string
          related_metrics?: Json | null
          severity?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_memory_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_memory_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
        ]
      }
      health_metrics: {
        Row: {
          activity_score: number | null
          appetite_score: number | null
          calculation_method: string | null
          created_at: string
          date: string
          id: string
          pet_id: string
          raw_data_count: number | null
          stool_score: number | null
          symptom_severity_score: number | null
          weight_delta: number | null
        }
        Insert: {
          activity_score?: number | null
          appetite_score?: number | null
          calculation_method?: string | null
          created_at?: string
          date: string
          id?: string
          pet_id: string
          raw_data_count?: number | null
          stool_score?: number | null
          symptom_severity_score?: number | null
          weight_delta?: number | null
        }
        Update: {
          activity_score?: number | null
          appetite_score?: number | null
          calculation_method?: string | null
          created_at?: string
          date?: string
          id?: string
          pet_id?: string
          raw_data_count?: number | null
          stool_score?: number | null
          symptom_severity_score?: number | null
          weight_delta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_metrics_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_metrics_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
        ]
      }
      health_records: {
        Row: {
          attachments: Json | null
          body_part: string | null
          created_at: string
          diagnosis: string | null
          diagnosis_code: string | null
          duration_days: number | null
          id: string
          medication_dosage: string | null
          medication_end: string | null
          medication_frequency: string | null
          medication_name: string | null
          medication_start: string | null
          metadata: Json | null
          notes: string | null
          pet_id: string
          profile_id: string
          record_time: string
          record_type: string
          related_event_id: string | null
          related_food_period_id: string | null
          severity: number | null
          symptom_code: string | null
          vet_clinic: string | null
          vet_name: string | null
          weight_kg: number | null
        }
        Insert: {
          attachments?: Json | null
          body_part?: string | null
          created_at?: string
          diagnosis?: string | null
          diagnosis_code?: string | null
          duration_days?: number | null
          id?: string
          medication_dosage?: string | null
          medication_end?: string | null
          medication_frequency?: string | null
          medication_name?: string | null
          medication_start?: string | null
          metadata?: Json | null
          notes?: string | null
          pet_id: string
          profile_id: string
          record_time?: string
          record_type: string
          related_event_id?: string | null
          related_food_period_id?: string | null
          severity?: number | null
          symptom_code?: string | null
          vet_clinic?: string | null
          vet_name?: string | null
          weight_kg?: number | null
        }
        Update: {
          attachments?: Json | null
          body_part?: string | null
          created_at?: string
          diagnosis?: string | null
          diagnosis_code?: string | null
          duration_days?: number | null
          id?: string
          medication_dosage?: string | null
          medication_end?: string | null
          medication_frequency?: string | null
          medication_name?: string | null
          medication_start?: string | null
          metadata?: Json | null
          notes?: string | null
          pet_id?: string
          profile_id?: string
          record_time?: string
          record_type?: string
          related_event_id?: string | null
          related_food_period_id?: string | null
          severity?: number | null
          symptom_code?: string | null
          vet_clinic?: string | null
          vet_name?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_records_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "pet_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_records_related_food_period_id_fkey"
            columns: ["related_food_period_id"]
            isOneToOne: false
            referencedRelation: "food_usage_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_records_symptom_code_fkey"
            columns: ["symptom_code"]
            isOneToOne: false
            referencedRelation: "symptom_ontology"
            referencedColumns: ["canonical_name"]
          },
        ]
      }
      health_reminders: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          is_completed: boolean
          last_notified_at: string | null
          metadata: Json | null
          pet_id: string
          profile_id: string
          reminder_type: string
          repeat_end_date: string | null
          repeat_interval: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          is_completed?: boolean
          last_notified_at?: string | null
          metadata?: Json | null
          pet_id: string
          profile_id: string
          reminder_type: string
          repeat_end_date?: string | null
          repeat_interval?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          is_completed?: boolean
          last_notified_at?: string | null
          metadata?: Json | null
          pet_id?: string
          profile_id?: string
          reminder_type?: string
          repeat_end_date?: string | null
          repeat_interval?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_reminders_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_reminders_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_reminders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_reminders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          pet_id: string | null
          product_id: string | null
          profile_id: string
          recommendation_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          pet_id?: string | null
          product_id?: string | null
          profile_id: string
          recommendation_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          pet_id?: string | null
          product_id?: string | null
          profile_id?: string
          recommendation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intent_events_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_events_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "intent_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_events_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendation_contexts"
            referencedColumns: ["id"]
          },
        ]
      }
      life_stage_history: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean | null
          life_stage: Database["public"]["Enums"]["life_stage_t"]
          notes: string | null
          pet_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          life_stage: Database["public"]["Enums"]["life_stage_t"]
          notes?: string | null
          pet_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          life_stage?: Database["public"]["Enums"]["life_stage_t"]
          notes?: string | null
          pet_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "life_stage_history_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "life_stage_history_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_events: {
        Row: {
          created_at: string
          id: string
          metric_name: string
          metric_type: string
          tags: Json | null
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metric_name: string
          metric_type: string
          tags?: Json | null
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          metric_name?: string
          metric_type?: string
          tags?: Json | null
          value?: number
        }
        Relationships: []
      }
      nlp_extractions: {
        Row: {
          confidence: number | null
          created_at: string
          food_mentions: Json | null
          health_indicators: Json | null
          id: string
          model_version: string | null
          processing_status: string | null
          source_id: string | null
          source_text: string
          source_type: string
          symptoms: Json | null
          timeline_events: Json | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          food_mentions?: Json | null
          health_indicators?: Json | null
          id?: string
          model_version?: string | null
          processing_status?: string | null
          source_id?: string | null
          source_text: string
          source_type: string
          symptoms?: Json | null
          timeline_events?: Json | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          food_mentions?: Json | null
          health_indicators?: Json | null
          id?: string
          model_version?: string | null
          processing_status?: string | null
          source_id?: string | null
          source_text?: string
          source_type?: string
          symptoms?: Json | null
          timeline_events?: Json | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          channel: Database["public"]["Enums"]["notification_channel_t"]
          created_at: string
          id: string
          is_read: boolean
          is_sent: boolean
          profile_id: string
          sent_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type_t"]
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel_t"]
          created_at?: string
          id?: string
          is_read?: boolean
          is_sent?: boolean
          profile_id: string
          sent_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type_t"]
        }
        Update: {
          action_url?: string | null
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel_t"]
          created_at?: string
          id?: string
          is_read?: boolean
          is_sent?: boolean
          profile_id?: string
          sent_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type_t"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_computation_jobs: {
        Row: {
          aggregate_id: string | null
          causation_id: string | null
          correlation_id: string | null
          created_at: string | null
          dead_letter_reason: string | null
          decision_id: string | null
          error_message: string | null
          event_id: string | null
          id: string
          job_type: string
          max_retries: number | null
          payload: Json | null
          priority: number | null
          processed_at: string | null
          retry_count: number | null
          scheduled_at: string | null
          status: string | null
          target_id: string | null
          target_profile_id: string | null
        }
        Insert: {
          aggregate_id?: string | null
          causation_id?: string | null
          correlation_id?: string | null
          created_at?: string | null
          dead_letter_reason?: string | null
          decision_id?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          job_type: string
          max_retries?: number | null
          payload?: Json | null
          priority?: number | null
          processed_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          status?: string | null
          target_id?: string | null
          target_profile_id?: string | null
        }
        Update: {
          aggregate_id?: string | null
          causation_id?: string | null
          correlation_id?: string | null
          created_at?: string | null
          dead_letter_reason?: string | null
          decision_id?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          job_type?: string
          max_retries?: number | null
          payload?: Json | null
          priority?: number | null
          processed_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          status?: string | null
          target_id?: string | null
          target_profile_id?: string | null
        }
        Relationships: []
      }
      pet_allergies: {
        Row: {
          allergen: string
          confirmed: boolean | null
          id: string
          pet_id: string
          severity: string
        }
        Insert: {
          allergen: string
          confirmed?: boolean | null
          id?: string
          pet_id: string
          severity?: string
        }
        Update: {
          allergen?: string
          confirmed?: boolean | null
          id?: string
          pet_id?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_allergies_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_allergies_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_attachments: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          owner_id: string | null
          owner_type: string
          pet_id: string | null
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          owner_id?: string | null
          owner_type: string
          pet_id?: string | null
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          owner_id?: string | null
          owner_type?: string
          pet_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_attachments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_attachments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_disease_records: {
        Row: {
          created_at: string
          diagnosed_on: string | null
          id: string
          name: string
          notes: string | null
          pet_id: string
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          diagnosed_on?: string | null
          id?: string
          name: string
          notes?: string | null
          pet_id: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          diagnosed_on?: string | null
          id?: string
          name?: string
          notes?: string | null
          pet_id?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_disease_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_disease_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_events: {
        Row: {
          ai_confidence: number | null
          ai_extracted: boolean | null
          created_at: string
          duration_days: number | null
          event_time: string
          event_type: Database["public"]["Enums"]["pet_event_type_t"]
          id: string
          metadata: Json | null
          notes: string | null
          pet_id: string
          product_id: string | null
          profile_id: string
          raw_text: string | null
          review_id: string | null
          severity: number | null
          source_type: Database["public"]["Enums"]["event_source_t"]
          symptom_code: string | null
          trust_score: number | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_extracted?: boolean | null
          created_at?: string
          duration_days?: number | null
          event_time?: string
          event_type: Database["public"]["Enums"]["pet_event_type_t"]
          id?: string
          metadata?: Json | null
          notes?: string | null
          pet_id: string
          product_id?: string | null
          profile_id: string
          raw_text?: string | null
          review_id?: string | null
          severity?: number | null
          source_type?: Database["public"]["Enums"]["event_source_t"]
          symptom_code?: string | null
          trust_score?: number | null
        }
        Update: {
          ai_confidence?: number | null
          ai_extracted?: boolean | null
          created_at?: string
          duration_days?: number | null
          event_time?: string
          event_type?: Database["public"]["Enums"]["pet_event_type_t"]
          id?: string
          metadata?: Json | null
          notes?: string | null
          pet_id?: string
          product_id?: string | null
          profile_id?: string
          raw_text?: string | null
          review_id?: string | null
          severity?: number | null
          source_type?: Database["public"]["Enums"]["event_source_t"]
          symptom_code?: string | null
          trust_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_events_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_events_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "pet_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_events_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_medication_records: {
        Row: {
          created_at: string
          dosage: string | null
          ended_on: string | null
          frequency: string | null
          id: string
          is_ongoing: boolean
          name: string
          notes: string | null
          pet_id: string
          started_on: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          ended_on?: string | null
          frequency?: string | null
          id?: string
          is_ongoing?: boolean
          name: string
          notes?: string | null
          pet_id: string
          started_on?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dosage?: string | null
          ended_on?: string | null
          frequency?: string | null
          id?: string
          is_ongoing?: boolean
          name?: string
          notes?: string | null
          pet_id?: string
          started_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_medication_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_medication_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          age_days: number | null
          age_months: number
          age_years: number
          avatar_url: string | null
          birth_date: string | null
          breed: string | null
          created_at: string
          disease_history: string | null
          environment_id: string | null
          gender: Database["public"]["Enums"]["pet_gender_t"]
          home_age_days: number | null
          home_age_months: number
          home_age_years: number
          home_date: string | null
          id: string
          is_active: boolean
          life_stage: Database["public"]["Enums"]["life_stage_t"] | null
          life_stage_updated_at: string | null
          medication_log: string | null
          name: string
          neutered: boolean | null
          pet_source: Database["public"]["Enums"]["pet_source_t"] | null
          photo_url: string | null
          profile_id: string
          species: Database["public"]["Enums"]["pet_species_t"]
          stomach_health: Database["public"]["Enums"]["stomach_health_t"]
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          age_days?: number | null
          age_months?: number
          age_years?: number
          avatar_url?: string | null
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          disease_history?: string | null
          environment_id?: string | null
          gender?: Database["public"]["Enums"]["pet_gender_t"]
          home_age_days?: number | null
          home_age_months?: number
          home_age_years?: number
          home_date?: string | null
          id?: string
          is_active?: boolean
          life_stage?: Database["public"]["Enums"]["life_stage_t"] | null
          life_stage_updated_at?: string | null
          medication_log?: string | null
          name: string
          neutered?: boolean | null
          pet_source?: Database["public"]["Enums"]["pet_source_t"] | null
          photo_url?: string | null
          profile_id: string
          species?: Database["public"]["Enums"]["pet_species_t"]
          stomach_health?: Database["public"]["Enums"]["stomach_health_t"]
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          age_days?: number | null
          age_months?: number
          age_years?: number
          avatar_url?: string | null
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          disease_history?: string | null
          environment_id?: string | null
          gender?: Database["public"]["Enums"]["pet_gender_t"]
          home_age_days?: number | null
          home_age_months?: number
          home_age_years?: number
          home_date?: string | null
          id?: string
          is_active?: boolean
          life_stage?: Database["public"]["Enums"]["life_stage_t"] | null
          life_stage_updated_at?: string | null
          medication_log?: string | null
          name?: string
          neutered?: boolean | null
          pet_source?: Database["public"]["Enums"]["pet_source_t"] | null
          photo_url?: string | null
          profile_id?: string
          species?: Database["public"]["Enums"]["pet_species_t"]
          stomach_health?: Database["public"]["Enums"]["stomach_health_t"]
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_bookmarks: {
        Row: {
          created_at: string
          product_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_bookmarks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_bookmarks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_bookmarks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_bookmarks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          display_order: number
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          display_order: number
          id: string
          image_url: string
          is_primary: boolean
          product_id: string
        }
        Insert: {
          display_order?: number
          id?: string
          image_url: string
          is_primary?: boolean
          product_id: string
        }
        Update: {
          display_order?: number
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ingredients: {
        Row: {
          allergen_risk: string[] | null
          display_order: number
          id: string
          ingredient_name: string
          ingredient_type:
            | Database["public"]["Enums"]["ingredient_type_t"]
            | null
          is_grain_free: boolean | null
          is_novel_protein: boolean | null
          notes: string | null
          nutrition_tags: string[] | null
          percentage: number | null
          product_id: string
        }
        Insert: {
          allergen_risk?: string[] | null
          display_order?: number
          id?: string
          ingredient_name: string
          ingredient_type?:
            | Database["public"]["Enums"]["ingredient_type_t"]
            | null
          is_grain_free?: boolean | null
          is_novel_protein?: boolean | null
          notes?: string | null
          nutrition_tags?: string[] | null
          percentage?: number | null
          product_id: string
        }
        Update: {
          allergen_risk?: string[] | null
          display_order?: number
          id?: string
          ingredient_name?: string
          ingredient_type?:
            | Database["public"]["Enums"]["ingredient_type_t"]
            | null
          is_grain_free?: boolean | null
          is_novel_protein?: boolean | null
          notes?: string | null
          nutrition_tags?: string[] | null
          percentage?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_metrics_daily: {
        Row: {
          allergy_risk_score: number | null
          average_rating: number | null
          breed_match_score: number | null
          coat_improve_rate: number | null
          data_completeness: string
          date: string
          dispute_rate: number | null
          energy_improve_rate: number | null
          id: string
          kitten_suitable_rating: number | null
          long_term_stability_score: number | null
          new_review_count: number | null
          product_id: string
          report_count: number | null
          repurchase_rate: number | null
          review_count: number | null
          risk_score: number | null
          senior_suitable_rating: number | null
          sensitive_gut_score: number | null
          sensitive_stomach_rating: number | null
          stool_issue_rate: number | null
          total_reviews_cumulative: number | null
        }
        Insert: {
          allergy_risk_score?: number | null
          average_rating?: number | null
          breed_match_score?: number | null
          coat_improve_rate?: number | null
          data_completeness?: string
          date: string
          dispute_rate?: number | null
          energy_improve_rate?: number | null
          id?: string
          kitten_suitable_rating?: number | null
          long_term_stability_score?: number | null
          new_review_count?: number | null
          product_id: string
          report_count?: number | null
          repurchase_rate?: number | null
          review_count?: number | null
          risk_score?: number | null
          senior_suitable_rating?: number | null
          sensitive_gut_score?: number | null
          sensitive_stomach_rating?: number | null
          stool_issue_rate?: number | null
          total_reviews_cumulative?: number | null
        }
        Update: {
          allergy_risk_score?: number | null
          average_rating?: number | null
          breed_match_score?: number | null
          coat_improve_rate?: number | null
          data_completeness?: string
          date?: string
          dispute_rate?: number | null
          energy_improve_rate?: number | null
          id?: string
          kitten_suitable_rating?: number | null
          long_term_stability_score?: number | null
          new_review_count?: number | null
          product_id?: string
          report_count?: number | null
          repurchase_rate?: number | null
          review_count?: number | null
          risk_score?: number | null
          senior_suitable_rating?: number | null
          sensitive_gut_score?: number | null
          sensitive_stomach_rating?: number | null
          stool_issue_rate?: number | null
          total_reviews_cumulative?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_metrics_daily_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_metrics_daily_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          black_chin_rating: number | null
          coat_rating: number | null
          cons: string | null
          created_at: string
          embedding: string | null
          energy_rating: number | null
          event_id: string | null
          food_period_id: string | null
          has_voucher: boolean
          helpful_count: number | null
          id: string
          overall_rating: number | null
          palatability_rating: number | null
          pet_id: string
          product_id: string
          product_version_id: string | null
          profile_id: string
          pros: string | null
          review_text: string | null
          review_trust_score: number | null
          shedding_rating: number | null
          stool_rating: number | null
          tear_stain_rating: number | null
          transition_period_days: number | null
          updated_at: string
          usage_duration: Database["public"]["Enums"]["usage_duration_t"]
          usage_duration_custom_days: number | null
          verified_purchase: boolean
          vomit_rating: number | null
          would_repurchase: boolean | null
        }
        Insert: {
          black_chin_rating?: number | null
          coat_rating?: number | null
          cons?: string | null
          created_at?: string
          embedding?: string | null
          energy_rating?: number | null
          event_id?: string | null
          food_period_id?: string | null
          has_voucher?: boolean
          helpful_count?: number | null
          id?: string
          overall_rating?: number | null
          palatability_rating?: number | null
          pet_id: string
          product_id: string
          product_version_id?: string | null
          profile_id: string
          pros?: string | null
          review_text?: string | null
          review_trust_score?: number | null
          shedding_rating?: number | null
          stool_rating?: number | null
          tear_stain_rating?: number | null
          transition_period_days?: number | null
          updated_at?: string
          usage_duration?: Database["public"]["Enums"]["usage_duration_t"]
          usage_duration_custom_days?: number | null
          verified_purchase?: boolean
          vomit_rating?: number | null
          would_repurchase?: boolean | null
        }
        Update: {
          black_chin_rating?: number | null
          coat_rating?: number | null
          cons?: string | null
          created_at?: string
          embedding?: string | null
          energy_rating?: number | null
          event_id?: string | null
          food_period_id?: string | null
          has_voucher?: boolean
          helpful_count?: number | null
          id?: string
          overall_rating?: number | null
          palatability_rating?: number | null
          pet_id?: string
          product_id?: string
          product_version_id?: string | null
          profile_id?: string
          pros?: string | null
          review_text?: string | null
          review_trust_score?: number | null
          shedding_rating?: number | null
          stool_rating?: number | null
          tear_stain_rating?: number | null
          transition_period_days?: number | null
          updated_at?: string
          usage_duration?: Database["public"]["Enums"]["usage_duration_t"]
          usage_duration_custom_days?: number | null
          verified_purchase?: boolean
          vomit_rating?: number | null
          would_repurchase?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_food_period_id_fkey"
            columns: ["food_period_id"]
            isOneToOne: false
            referencedRelation: "food_usage_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tags: {
        Row: {
          confidence: number | null
          created_at: string | null
          created_by: string | null
          id: string
          product_id: string
          source: string | null
          tag_key: string
          tag_type: string
          tag_value: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          product_id: string
          source?: string | null
          tag_key: string
          tag_type: string
          tag_value: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          product_id?: string
          source?: string | null
          tag_key?: string
          tag_type?: string
          tag_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_versions: {
        Row: {
          created_at: string
          effective_date: string | null
          end_date: string | null
          formula_changes: string | null
          id: string
          ingredients_snapshot: Json | null
          is_current: boolean | null
          nutrition_snapshot: Json | null
          product_id: string
          version_name: string
        }
        Insert: {
          created_at?: string
          effective_date?: string | null
          end_date?: string | null
          formula_changes?: string | null
          id?: string
          ingredients_snapshot?: Json | null
          is_current?: boolean | null
          nutrition_snapshot?: Json | null
          product_id: string
          version_name: string
        }
        Update: {
          created_at?: string
          effective_date?: string | null
          end_date?: string | null
          formula_changes?: string | null
          id?: string
          ingredients_snapshot?: Json | null
          is_current?: boolean | null
          nutrition_snapshot?: Json | null
          product_id?: string
          version_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          applicable_age: string
          applicable_species: string
          brand: string
          category_id: string
          created_at: string
          description: string | null
          embedding: string | null
          factory_transparency: number | null
          id: string
          image_url: string | null
          ingredient_transparency: number | null
          is_active: boolean
          manufacturer: string | null
          name: string
          origin_country: string | null
          price_max: number | null
          price_min: number | null
          testing_disclosure: number | null
          transparency_score: number | null
          updated_at: string
        }
        Insert: {
          applicable_age?: string
          applicable_species?: string
          brand: string
          category_id: string
          created_at?: string
          description?: string | null
          embedding?: string | null
          factory_transparency?: number | null
          id?: string
          image_url?: string | null
          ingredient_transparency?: number | null
          is_active?: boolean
          manufacturer?: string | null
          name: string
          origin_country?: string | null
          price_max?: number | null
          price_min?: number | null
          testing_disclosure?: number | null
          transparency_score?: number | null
          updated_at?: string
        }
        Update: {
          applicable_age?: string
          applicable_species?: string
          brand?: string
          category_id?: string
          created_at?: string
          description?: string | null
          embedding?: string | null
          factory_transparency?: number | null
          id?: string
          image_url?: string | null
          ingredient_transparency?: number | null
          is_active?: boolean
          manufacturer?: string | null
          name?: string
          origin_country?: string | null
          price_max?: number | null
          price_min?: number | null
          testing_disclosure?: number | null
          transparency_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          behavior_score: number | null
          bio: string | null
          birth_date: string | null
          community_banned_until: string | null
          created_at: string
          display_name: string | null
          flag_reason: string | null
          id: string
          is_admin: boolean
          is_flagged: boolean | null
          long_term_review_count: number | null
          pet_profile_completeness: number | null
          phone_verified_at: string | null
          review_count: number | null
          trust_score: number | null
          updated_at: string
          user_number: number | null
          username: string
          verified_purchase_count: number | null
        }
        Insert: {
          avatar_url?: string | null
          behavior_score?: number | null
          bio?: string | null
          birth_date?: string | null
          community_banned_until?: string | null
          created_at?: string
          display_name?: string | null
          flag_reason?: string | null
          id: string
          is_admin?: boolean
          is_flagged?: boolean | null
          long_term_review_count?: number | null
          pet_profile_completeness?: number | null
          phone_verified_at?: string | null
          review_count?: number | null
          trust_score?: number | null
          updated_at?: string
          user_number?: number | null
          username: string
          verified_purchase_count?: number | null
        }
        Update: {
          avatar_url?: string | null
          behavior_score?: number | null
          bio?: string | null
          birth_date?: string | null
          community_banned_until?: string | null
          created_at?: string
          display_name?: string | null
          flag_reason?: string | null
          id?: string
          is_admin?: boolean
          is_flagged?: boolean | null
          long_term_review_count?: number | null
          pet_profile_completeness?: number | null
          phone_verified_at?: string | null
          review_count?: number | null
          trust_score?: number | null
          updated_at?: string
          user_number?: number | null
          username?: string
          verified_purchase_count?: number | null
        }
        Relationships: []
      }
      recommendation_contexts: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          pet_id: string | null
          product_id: string | null
          profile_id: string
          reason: string | null
          recommendation_type: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          pet_id?: string | null
          product_id?: string | null
          profile_id: string
          reason?: string | null
          recommendation_type: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          pet_id?: string | null
          product_id?: string | null
          profile_id?: string
          reason?: string | null
          recommendation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_contexts_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_contexts_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_contexts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "recommendation_contexts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_contexts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_contexts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_feedback: {
        Row: {
          action: string
          created_at: string
          id: string
          notes: string | null
          pet_id: string
          product_id: string
          profile_id: string
          rating: number | null
          recommendation_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          notes?: string | null
          pet_id: string
          product_id: string
          profile_id: string
          rating?: number | null
          recommendation_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          notes?: string | null
          pet_id?: string
          product_id?: string
          profile_id?: string
          rating?: number | null
          recommendation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_feedback_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_feedback_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_feedback_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "recommendation_feedback_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_feedback_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_feedback_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_trace_log: {
        Row: {
          created_at: string
          data_sources: string[]
          decision_graph: Json
          feature_snapshot: Json
          id: string
          input_features: Json | null
          model_version: string
          pet_id: string
          profile_id: string
          session_id: string
          user_segment: string | null
        }
        Insert: {
          created_at?: string
          data_sources?: string[]
          decision_graph?: Json
          feature_snapshot?: Json
          id?: string
          input_features?: Json | null
          model_version?: string
          pet_id: string
          profile_id: string
          session_id: string
          user_segment?: string | null
        }
        Update: {
          created_at?: string
          data_sources?: string[]
          decision_graph?: Json
          feature_snapshot?: Json
          id?: string
          input_features?: Json | null
          model_version?: string
          pet_id?: string
          profile_id?: string
          session_id?: string
          user_segment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_trace_log_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_trace_log_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_trace_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_trace_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_followup_entries: {
        Row: {
          appetite_status: string | null
          coat_status: string | null
          continued_usage: boolean | null
          created_at: string
          energy_status: string | null
          health_notes: string | null
          id: string
          overall_satisfaction: number | null
          profile_id: string
          repurchase_intent: string | null
          schedule_id: string
          stool_status: string | null
          weight_change: string | null
        }
        Insert: {
          appetite_status?: string | null
          coat_status?: string | null
          continued_usage?: boolean | null
          created_at?: string
          energy_status?: string | null
          health_notes?: string | null
          id?: string
          overall_satisfaction?: number | null
          profile_id: string
          repurchase_intent?: string | null
          schedule_id: string
          stool_status?: string | null
          weight_change?: string | null
        }
        Update: {
          appetite_status?: string | null
          coat_status?: string | null
          continued_usage?: boolean | null
          created_at?: string
          energy_status?: string | null
          health_notes?: string | null
          id?: string
          overall_satisfaction?: number | null
          profile_id?: string
          repurchase_intent?: string | null
          schedule_id?: string
          stool_status?: string | null
          weight_change?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_followup_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_followup_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_followup_entries_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "review_followup_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      review_followup_schedules: {
        Row: {
          completed_at: string | null
          created_at: string
          due_date: string
          followup_day: number
          id: string
          profile_id: string
          reminder_sent_at: string | null
          review_id: string
          status: Database["public"]["Enums"]["followup_status_t"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_date: string
          followup_day: number
          id?: string
          profile_id: string
          reminder_sent_at?: string | null
          review_id: string
          status?: Database["public"]["Enums"]["followup_status_t"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_date?: string
          followup_day?: number
          id?: string
          profile_id?: string
          reminder_sent_at?: string | null
          review_id?: string
          status?: Database["public"]["Enums"]["followup_status_t"]
        }
        Relationships: [
          {
            foreignKeyName: "review_followup_schedules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_followup_schedules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_followup_schedules_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_vouchers: {
        Row: {
          created_at: string
          file_type: string
          file_url: string
          id: string
          review_id: string
        }
        Insert: {
          created_at?: string
          file_type?: string
          file_url: string
          id?: string
          review_id: string
        }
        Update: {
          created_at?: string
          file_type?: string
          file_url?: string
          id?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_vouchers_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_event_graph: {
        Row: {
          cluster_id: string
          connections: string[]
          decay_score: number
          event_id: string
          id: string
          severity: string
          updated_at: string
        }
        Insert: {
          cluster_id: string
          connections?: string[]
          decay_score?: number
          event_id: string
          id?: string
          severity: string
          updated_at?: string
        }
        Update: {
          cluster_id?: string
          connections?: string[]
          decay_score?: number
          event_id?: string
          id?: string
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_event_graph_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "risk_events"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_events: {
        Row: {
          batch: string | null
          brand: string
          created_at: string
          description: string
          event_date: string
          event_type: Database["public"]["Enums"]["risk_event_type_t"]
          id: string
          product_id: string | null
          report_count: number
          resolved: boolean
          resolved_at: string | null
          severity: Database["public"]["Enums"]["risk_severity_t"]
          source_urls: string[] | null
          title: string
          trend: Database["public"]["Enums"]["risk_trend_t"]
        }
        Insert: {
          batch?: string | null
          brand: string
          created_at?: string
          description: string
          event_date?: string
          event_type?: Database["public"]["Enums"]["risk_event_type_t"]
          id?: string
          product_id?: string | null
          report_count?: number
          resolved?: boolean
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["risk_severity_t"]
          source_urls?: string[] | null
          title: string
          trend?: Database["public"]["Enums"]["risk_trend_t"]
        }
        Update: {
          batch?: string | null
          brand?: string
          created_at?: string
          description?: string
          event_date?: string
          event_type?: Database["public"]["Enums"]["risk_event_type_t"]
          id?: string
          product_id?: string | null
          report_count?: number
          resolved?: boolean
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["risk_severity_t"]
          source_urls?: string[] | null
          title?: string
          trend?: Database["public"]["Enums"]["risk_trend_t"]
        }
        Relationships: [
          {
            foreignKeyName: "risk_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "risk_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stable_samples: {
        Row: {
          coat_stable: boolean | null
          created_at: string
          end_date: string
          energy_stable: boolean | null
          food_period_id: string | null
          id: string
          is_training_sample: boolean | null
          no_symptoms: boolean | null
          pet_id: string
          product_id: string
          sample_quality: string | null
          stability_score: number
          stable_days: number
          start_date: string
          stool_stable: boolean | null
          weight_stable: boolean | null
        }
        Insert: {
          coat_stable?: boolean | null
          created_at?: string
          end_date: string
          energy_stable?: boolean | null
          food_period_id?: string | null
          id?: string
          is_training_sample?: boolean | null
          no_symptoms?: boolean | null
          pet_id: string
          product_id: string
          sample_quality?: string | null
          stability_score: number
          stable_days: number
          start_date: string
          stool_stable?: boolean | null
          weight_stable?: boolean | null
        }
        Update: {
          coat_stable?: boolean | null
          created_at?: string
          end_date?: string
          energy_stable?: boolean | null
          food_period_id?: string | null
          id?: string
          is_training_sample?: boolean | null
          no_symptoms?: boolean | null
          pet_id?: string
          product_id?: string
          sample_quality?: string | null
          stability_score?: number
          stable_days?: number
          start_date?: string
          stool_stable?: boolean | null
          weight_stable?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "stable_samples_food_period_id_fkey"
            columns: ["food_period_id"]
            isOneToOne: false
            referencedRelation: "food_usage_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stable_samples_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stable_samples_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stable_samples_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stable_samples_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_learning_config: {
        Row: {
          config_key: string
          config_value: Json
          description: string | null
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: Json
          description?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          description?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      strategy_performance_log: {
        Row: {
          context_snapshot: Json | null
          correctness_score: number | null
          created_at: string
          execution_path: string
          execution_quality: number | null
          execution_time_ms: number | null
          id: string
          outcome_score: number | null
          pet_id: string
          strategy_type: string
          user_feedback: number | null
        }
        Insert: {
          context_snapshot?: Json | null
          correctness_score?: number | null
          created_at?: string
          execution_path: string
          execution_quality?: number | null
          execution_time_ms?: number | null
          id?: string
          outcome_score?: number | null
          pet_id: string
          strategy_type: string
          user_feedback?: number | null
        }
        Update: {
          context_snapshot?: Json | null
          correctness_score?: number | null
          created_at?: string
          execution_path?: string
          execution_quality?: number | null
          execution_time_ms?: number | null
          id?: string
          outcome_score?: number | null
          pet_id?: string
          strategy_type?: string
          user_feedback?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_performance_log_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_performance_log_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_scores: {
        Row: {
          created_at: string
          id: string
          last_score_change: number | null
          last_updated: string
          last_used_at: string | null
          performance_score: number
          score_trend: string | null
          strategy_type: string
          success_count: number
          success_rate: number
          usage_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_score_change?: number | null
          last_updated?: string
          last_used_at?: string | null
          performance_score?: number
          score_trend?: string | null
          strategy_type: string
          success_count?: number
          success_rate?: number
          usage_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_score_change?: number | null
          last_updated?: string
          last_used_at?: string | null
          performance_score?: number
          score_trend?: string | null
          strategy_type?: string
          success_count?: number
          success_rate?: number
          usage_count?: number
        }
        Relationships: []
      }
      symptom_ontology: {
        Row: {
          aliases: Json | null
          canonical_name: string
          category: string
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          severity_default: number | null
        }
        Insert: {
          aliases?: Json | null
          canonical_name: string
          category: string
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          severity_default?: number | null
        }
        Update: {
          aliases?: Json | null
          canonical_name?: string
          category?: string
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          severity_default?: number | null
        }
        Relationships: []
      }
      third_party_audit_log: {
        Row: {
          audit_type: string
          created_at: string
          id: string
          profile_id: string
          provider: string
          request_payload_hash: string
          response_label: string | null
          response_passed: boolean
        }
        Insert: {
          audit_type: string
          created_at?: string
          id?: string
          profile_id: string
          provider?: string
          request_payload_hash: string
          response_label?: string | null
          response_passed: boolean
        }
        Update: {
          audit_type?: string
          created_at?: string
          id?: string
          profile_id?: string
          provider?: string
          request_payload_hash?: string
          response_label?: string | null
          response_passed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "third_party_audit_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "third_party_audit_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_arbitration_log: {
        Row: {
          agent_votes: Json
          created_at: string
          final_decision: string
          final_score: number | null
          id: string
          override_reason: string | null
          recommendation_id: string | null
          trace_id: string
        }
        Insert: {
          agent_votes?: Json
          created_at?: string
          final_decision: string
          final_score?: number | null
          id?: string
          override_reason?: string | null
          recommendation_id?: string | null
          trace_id: string
        }
        Update: {
          agent_votes?: Json
          created_at?: string
          final_decision?: string
          final_score?: number | null
          id?: string
          override_reason?: string | null
          recommendation_id?: string | null
          trace_id?: string
        }
        Relationships: []
      }
      user_behavior_log: {
        Row: {
          context: Json | null
          created_at: string
          event_type: Database["public"]["Enums"]["behavior_event_t"]
          id: string
          profile_id: string
          severity: number | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          event_type: Database["public"]["Enums"]["behavior_event_t"]
          id?: string
          profile_id: string
          severity?: number | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["behavior_event_t"]
          id?: string
          profile_id?: string
          severity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_behavior_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_behavior_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      write_idempotency_keys: {
        Row: {
          created_at: string
          expires_at: string
          key: string
          result: Json
        }
        Insert: {
          created_at?: string
          expires_at: string
          key: string
          result: Json
        }
        Update: {
          created_at?: string
          expires_at?: string
          key?: string
          result?: Json
        }
        Relationships: []
      }
    }
    Views: {
      breed_product_stats: {
        Row: {
          avg_rating: number | null
          avg_stool_rating: number | null
          breed: string | null
          continued_usage_rate: number | null
          long_term_stool_improve_rate: number | null
          product_id: string | null
          repurchase_rate: number | null
          review_count: number | null
          stool_issue_rate: number | null
        }
        Relationships: []
      }
      breed_risk_analysis: {
        Row: {
          affected_pets: number | null
          avg_severity: number | null
          breed: string | null
          median_severity: number | null
          occurrence_count: number | null
          products_involved: number | null
          species: Database["public"]["Enums"]["pet_species_t"] | null
          symptom_code: string | null
          symptom_name: string | null
        }
        Relationships: []
      }
      food_long_term_outcomes: {
        Row: {
          brand: string | null
          breed: string | null
          end_date: string | null
          event_count: number | null
          life_stage: Database["public"]["Enums"]["life_stage_t"] | null
          pet_id: string | null
          product_id: string | null
          product_name: string | null
          species: Database["public"]["Enums"]["pet_species_t"] | null
          stability_score: number | null
          start_date: string | null
          symptom_count: number | null
          would_continue: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "food_usage_periods_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_usage_periods_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_usage_periods_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "breed_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "food_usage_periods_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_complete_timeline: {
        Row: {
          breed: string | null
          event_time: string | null
          event_type: Database["public"]["Enums"]["pet_event_type_t"] | null
          metadata: Json | null
          notes: string | null
          pet_id: string | null
          pet_name: string | null
          product_brand: string | null
          product_name: string | null
          severity: number | null
          species: Database["public"]["Enums"]["pet_species_t"] | null
          symptom_code: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_events_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_events_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_with_age"
            referencedColumns: ["id"]
          },
        ]
      }
      pets_with_age: {
        Row: {
          age_days: number | null
          age_months: number | null
          age_months_compat: number | null
          age_years: number | null
          age_years_compat: number | null
          birth_date: string | null
          breed: string | null
          created_at: string | null
          disease_history: string | null
          environment_id: string | null
          gender: Database["public"]["Enums"]["pet_gender_t"] | null
          home_age_days: number | null
          home_age_months: number | null
          home_age_years: number | null
          home_date: string | null
          id: string | null
          is_active: boolean | null
          life_stage: Database["public"]["Enums"]["life_stage_t"] | null
          life_stage_updated_at: string | null
          medication_log: string | null
          name: string | null
          neutered: boolean | null
          pet_source: Database["public"]["Enums"]["pet_source_t"] | null
          photo_url: string | null
          profile_id: string | null
          species: Database["public"]["Enums"]["pet_species_t"] | null
          stomach_health: Database["public"]["Enums"]["stomach_health_t"] | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          age_days?: number | null
          age_months?: number | null
          age_months_compat?: never
          age_years?: number | null
          age_years_compat?: never
          birth_date?: string | null
          breed?: string | null
          created_at?: string | null
          disease_history?: string | null
          environment_id?: string | null
          gender?: Database["public"]["Enums"]["pet_gender_t"] | null
          home_age_days?: number | null
          home_age_months?: number | null
          home_age_years?: number | null
          home_date?: string | null
          id?: string | null
          is_active?: boolean | null
          life_stage?: Database["public"]["Enums"]["life_stage_t"] | null
          life_stage_updated_at?: string | null
          medication_log?: string | null
          name?: string | null
          neutered?: boolean | null
          pet_source?: Database["public"]["Enums"]["pet_source_t"] | null
          photo_url?: string | null
          profile_id?: string | null
          species?: Database["public"]["Enums"]["pet_species_t"] | null
          stomach_health?:
            | Database["public"]["Enums"]["stomach_health_t"]
            | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          age_days?: number | null
          age_months?: number | null
          age_months_compat?: never
          age_years?: number | null
          age_years_compat?: never
          birth_date?: string | null
          breed?: string | null
          created_at?: string | null
          disease_history?: string | null
          environment_id?: string | null
          gender?: Database["public"]["Enums"]["pet_gender_t"] | null
          home_age_days?: number | null
          home_age_months?: number | null
          home_age_years?: number | null
          home_date?: string | null
          id?: string | null
          is_active?: boolean | null
          life_stage?: Database["public"]["Enums"]["life_stage_t"] | null
          life_stage_updated_at?: string | null
          medication_log?: string | null
          name?: string | null
          neutered?: boolean | null
          pet_source?: Database["public"]["Enums"]["pet_source_t"] | null
          photo_url?: string | null
          profile_id?: string | null
          species?: Database["public"]["Enums"]["pet_species_t"] | null
          stomach_health?:
            | Database["public"]["Enums"]["stomach_health_t"]
            | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          long_term_review_count: number | null
          pet_profile_completeness: number | null
          review_count: number | null
          trust_score: number | null
          user_number: number | null
          username: string | null
          verified_purchase_count: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          long_term_review_count?: number | null
          pet_profile_completeness?: number | null
          review_count?: number | null
          trust_score?: number | null
          user_number?: number | null
          username?: string | null
          verified_purchase_count?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          long_term_review_count?: number | null
          pet_profile_completeness?: number | null
          review_count?: number | null
          trust_score?: number | null
          user_number?: number | null
          username?: string | null
          verified_purchase_count?: number | null
        }
        Relationships: []
      }
      security_policy_audit: {
        Row: {
          access_roles: string | null
          operation: string | null
          policyname: unknown
          schemaname: unknown
          security_classification: string | null
          tablename: unknown
        }
        Relationships: []
      }
    }
    Functions: {
      analyze_version_impact: { Args: { p_product_id: string }; Returns: Json }
      auto_approve_stale_posts: { Args: never; Returns: number }
      backfill_timeline_groups: {
        Args: { p_author_id?: string; p_product_id?: string }
        Returns: number
      }
      build_ai_context: {
        Args: { p_date?: string; p_pet_id: string; p_range_days?: number }
        Returns: Json
      }
      build_recommendation_context: {
        Args: { p_pet_id: string }
        Returns: Json
      }
      build_timeline_group: {
        Args: {
          p_author_id: string
          p_product_id: string
          p_review_date: string
          p_review_id: string
          p_review_text?: string
        }
        Returns: Json
      }
      calculate_activity_score: {
        Args: { p_date: string; p_pet_id: string; p_window_days?: number }
        Returns: number
      }
      calculate_appetite_score: {
        Args: { p_date: string; p_pet_id: string; p_window_days?: number }
        Returns: number
      }
      calculate_daily_metrics: {
        Args: { p_date: string; p_pet_id: string }
        Returns: undefined
      }
      calculate_life_stage: {
        Args: { birth_date: string; species: string }
        Returns: Database["public"]["Enums"]["life_stage_t"]
      }
      calculate_review_trust_score: {
        Args: { review: Database["public"]["Tables"]["product_reviews"]["Row"] }
        Returns: number
      }
      calculate_stool_score: {
        Args: { p_date: string; p_pet_id: string; p_window_days?: number }
        Returns: number
      }
      calculate_symptom_severity: {
        Args: { p_date: string; p_pet_id: string; p_window_days?: number }
        Returns: number
      }
      calculate_timeline_trust_score: {
        Args: { p_timeline_group_id: string }
        Returns: number
      }
      calculate_trust_score: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: number
      }
      calculate_weight_delta: {
        Args: { p_date: string; p_pet_id: string; p_window_days?: number }
        Returns: number
      }
      check_community_post_rate_limit: {
        Args: { p_profile_id: string }
        Returns: boolean
      }
      cleanup_expired_idempotency_keys: { Args: never; Returns: undefined }
      cluster_risk_events: { Args: { p_product_id: string }; Returns: Json }
      compute_product_confidence: {
        Args: { p_product_id: string }
        Returns: number
      }
      compute_user_reputation: {
        Args: { p_profile_id: string }
        Returns: number
      }
      create_community_post: {
        Args: {
          p_breed: string
          p_content: string
          p_images: string[]
          p_ip_address?: string
          p_pet_type: string
        }
        Returns: string
      }
      detect_risk_anomalies: { Args: { p_product_id: string }; Returns: Json }
      event_store_append: {
        Args: {
          p_aggregate_id: string
          p_aggregate_type: string
          p_causation_id?: string
          p_correlation_id?: string
          p_decision_id?: string
          p_event_type: string
          p_metadata?: Json
          p_payload?: Json
        }
        Returns: string
      }
      event_store_query_by_causation: {
        Args: { p_causation_id: string }
        Returns: {
          aggregate_id: string
          aggregate_type: string
          causation_id: string
          correlation_id: string
          created_at: string
          decision_id: string
          event_id: string
          event_type: string
          global_sequence: number
          metadata: Json
          payload: Json
          stream_version: number
        }[]
      }
      event_store_query_by_correlation: {
        Args: { p_correlation_id: string }
        Returns: {
          aggregate_id: string
          aggregate_type: string
          causation_id: string
          correlation_id: string
          created_at: string
          decision_id: string
          event_id: string
          event_type: string
          global_sequence: number
          metadata: Json
          payload: Json
          stream_version: number
        }[]
      }
      event_store_query_by_decision: {
        Args: { p_decision_id: string }
        Returns: {
          aggregate_id: string
          aggregate_type: string
          causation_id: string
          correlation_id: string
          created_at: string
          decision_id: string
          event_id: string
          event_type: string
          global_sequence: number
          metadata: Json
          payload: Json
          stream_version: number
        }[]
      }
      generate_daily_summary: {
        Args: { p_date: string; p_pet_id: string }
        Returns: undefined
      }
      get_health_trends: {
        Args: { p_days?: number; p_pet_id: string }
        Returns: Json
      }
      get_next_user_number: { Args: never; Returns: number }
      get_pet_health_summary: { Args: { p_pet_id: string }; Returns: Json }
      get_pet_health_timeline: { Args: { p_pet_id: string }; Returns: Json }
      get_product_context_for_ai: {
        Args: { p_product_id: string }
        Returns: Json
      }
      get_product_long_term_risk: {
        Args: { p_product_id: string }
        Returns: Json
      }
      get_product_timeline_stats: {
        Args: { p_product_id: string }
        Returns: Json
      }
      get_risk_intelligence: { Args: { p_product_id: string }; Returns: Json }
      get_strategy_stats: {
        Args: { p_strategy_type: string }
        Returns: {
          avg_execution_time: number
          avg_outcome: number
          performance_score: number
          recent_performance: number
          score_trend: string
          strategy_type: string
          success_rate: number
          usage_count: number
        }[]
      }
      get_strategy_weights: {
        Args: never
        Returns: {
          performance_score: number
          strategy_type: string
          usage_count: number
          weight: number
        }[]
      }
      get_timeline_events: {
        Args: { p_timeline_group_id: string }
        Returns: {
          confidence: number
          created_at: string
          event_day: number
          event_type: string
          extracted_text: string
          extraction_model: string
          id: string
          metadata: Json
          review_id: string
          sentiment: string
          sentiment_score: number
          source_review_id: string
          status: string
          symptom: string
          symptom_severity: number
          timeline_group_id: string
        }[]
      }
      get_timeline_groups_for_author_product: {
        Args: { p_author_id: string; p_product_id: string }
        Returns: {
          author_id: string
          first_review_date: string
          has_opinion_change: boolean
          has_photos: boolean
          has_repurchase: boolean
          id: string
          last_review_date: string
          product_id: string
          review_count: number
          timeline_score: number
          total_days_span: number
          trust_factors: Json
        }[]
      }
      get_user_intent_funnel: {
        Args: { p_days?: number; p_profile_id: string }
        Returns: Json
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
      job_enqueue: {
        Args: {
          p_causation_id?: string
          p_correlation_id?: string
          p_decision_id?: string
          p_event_id?: string
          p_job_type: string
          p_max_retries?: number
          p_payload?: Json
          p_priority?: number
          p_scheduled_at?: string
          p_target_id?: string
          p_target_profile_id?: string
        }
        Returns: string
      }
      job_fetch_pending: {
        Args: { p_limit?: number }
        Returns: {
          aggregate_id: string
          causation_id: string
          correlation_id: string
          created_at: string
          decision_id: string
          error_message: string
          event_id: string
          id: string
          job_type: string
          max_retries: number
          metadata: Json
          payload: Json
          priority: number
          retry_count: number
          scheduled_at: string
          status: string
        }[]
      }
      job_mark_completed: {
        Args: { p_duration_ms: number; p_job_id: string }
        Returns: boolean
      }
      job_mark_processing: { Args: { p_job_id: string }; Returns: boolean }
      job_schedule_retry: {
        Args: {
          p_backoff_ms: number
          p_error_message: string
          p_job_id: string
        }
        Returns: boolean
      }
      log_strategy_performance: {
        Args: {
          p_context_snapshot?: Json
          p_correctness_score?: number
          p_execution_path: string
          p_execution_quality?: number
          p_execution_time_ms?: number
          p_outcome_score: number
          p_pet_id: string
          p_strategy_type: string
          p_user_feedback?: number
        }
        Returns: string
      }
      normalize_breed: { Args: { raw_breed: string }; Returns: string }
      refresh_breed_stats: { Args: never; Returns: undefined }
      refresh_product_metrics: {
        Args: { target_date?: string }
        Returns: undefined
      }
      run_analytics_job: {
        Args: { p_date?: string; p_pet_id?: string }
        Returns: string
      }
      save_health_memory: {
        Args: {
          p_description?: string
          p_first_observed?: string
          p_memory_type: string
          p_pet_id: string
          p_related_metrics?: Json
          p_severity?: string
          p_title: string
        }
        Returns: string
      }
      score_breakdown: {
        Args: { p_pet_id: string; p_product_id: string }
        Returns: Json
      }
      score_product_for_pet: {
        Args: { p_pet_id: string; p_product_id: string }
        Returns: Json
      }
      search_products: {
        Args: {
          category_filter?: string
          search_term: string
          species_filter?: string
        }
        Returns: {
          applicable_age: string
          applicable_species: string
          brand: string
          category_id: string
          created_at: string
          description: string | null
          embedding: string | null
          factory_transparency: number | null
          id: string
          image_url: string | null
          ingredient_transparency: number | null
          is_active: boolean
          manufacturer: string | null
          name: string
          origin_country: string | null
          price_max: number | null
          price_min: number | null
          testing_disclosure: number | null
          transparency_score: number | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_strategy_score: {
        Args: { p_outcome_score: number; p_strategy_type: string }
        Returns: undefined
      }
    }
    Enums: {
      activity_level_t: "very_low" | "low" | "medium" | "high" | "very_high"
      behavior_event_t:
        | "review_posted"
        | "review_edited"
        | "voucher_uploaded"
        | "review_deleted"
        | "rapid_posting"
        | "duplicate_content"
        | "suspicious_pattern"
        | "account_flag"
        | "community_post_published"
        | "community_post_rejected"
        | "community_post_auto_approved"
        | "community_post_flagged"
        | "community_post_restored"
      climate_type_t:
        | "tropical"
        | "subtropical"
        | "temperate"
        | "continental"
        | "arid"
        | "cold"
      community_report_category_t:
        | "spam"
        | "violence"
        | "pornography"
        | "political"
        | "fraud"
        | "privacy"
        | "other"
      community_review_status_t:
        | "pending"
        | "approved"
        | "rejected"
        | "auto_approved"
      daily_task_category_t:
        | "feeding"
        | "water"
        | "litter"
        | "walk"
        | "bowl_clean"
        | "deworm"
        | "grooming"
        | "medicine"
        | "other"
      daily_task_frequency_t: "daily" | "weekly" | "monthly" | "custom_days"
      event_source_t:
        | "user_input"
        | "ai_extraction"
        | "system_generated"
        | "imported"
      followup_status_t: "pending" | "reminded" | "completed" | "overdue"
      ingredient_type_t:
        | "protein"
        | "fat"
        | "carbohydrate"
        | "fiber"
        | "vitamin"
        | "mineral"
        | "preservative"
        | "additive"
        | "flavoring"
        | "colorant"
        | "other"
      insight_type_t:
        | "product_summary"
        | "risk_analysis"
        | "breed_match"
        | "comparison"
        | "ingredient_analysis"
        | "trend_prediction"
        | "recommendation"
      life_stage_t:
        | "kitten"
        | "young_adult"
        | "adult"
        | "senior"
        | "geriatric"
        | "super_senior"
      notification_channel_t: "in_app" | "email" | "push"
      notification_type_t:
        | "followup_reminder"
        | "followup_overdue"
        | "review_published"
        | "trust_score_change"
        | "task_reminder"
      pet_event_type_t:
        | "food_start"
        | "food_stop"
        | "food_switch"
        | "food_amount_change"
        | "symptom_observed"
        | "symptom_resolved"
        | "weight_change"
        | "energy_change"
        | "appetite_change"
        | "vet_visit"
        | "diagnosis"
        | "medication_start"
        | "medication_stop"
        | "vaccination"
        | "behavior_change"
        | "environment_change"
        | "review_posted"
        | "followup_completed"
        | "photo_uploaded"
      pet_gender_t: "male" | "female" | "unknown"
      pet_source_t:
        | "purchased"
        | "wild_rescued"
        | "home_raised"
        | "stray_adopted"
        | "other"
      pet_species_t: "cat" | "dog" | "other"
      risk_event_type_t:
        | "batch_abnormality"
        | "formula_change"
        | "dispute_surge"
        | "recall"
        | "quality_issue"
        | "other"
      risk_level_t: "low" | "medium" | "high" | "critical"
      risk_severity_t: "low" | "medium" | "high" | "critical"
      risk_trend_t: "rising" | "declining" | "stable"
      stomach_health_t: "normal" | "sensitive" | "very_sensitive"
      usage_duration_t:
        | "just_started"
        | "7d"
        | "14d"
        | "30d"
        | "60d"
        | "90d"
        | "180d+"
        | "lt_1w"
        | "1w_to_2w"
        | "2w_to_1m"
        | "1m_to_3m"
        | "m6"
        | "m6_to_1y"
        | "gt_1y"
        | "custom"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  // ===== PFLID Schema (Phase 3.95 Data Flywheel) =====
  pflid: {
    Tables: {
      cohort_intelligence: {
        Row: {
          avg_effectiveness_score: number | null
          avg_health_score: number | null
          avg_improvement_rate: number | null
          baseline_comparison: Json | null
          cohort_definition: Json
          cohort_key: string
          computed_at: string
          id: string
          member_count: number
          metadata: Json | null
          top_products: Json | null
          version: number
        }
        Insert: {
          avg_effectiveness_score?: number | null
          avg_health_score?: number | null
          avg_improvement_rate?: number | null
          baseline_comparison?: Json | null
          cohort_definition?: Json
          cohort_key: string
          computed_at?: string
          id?: string
          member_count?: number
          metadata?: Json | null
          top_products?: Json | null
          version?: number
        }
        Update: {
          avg_effectiveness_score?: number | null
          avg_health_score?: number | null
          avg_improvement_rate?: number | null
          baseline_comparison?: Json | null
          cohort_definition?: Json
          cohort_key?: string
          computed_at?: string
          id?: string
          member_count?: number
          metadata?: Json | null
          top_products?: Json | null
          version?: number
        }
        Relationships: []
      }
      effectiveness_scores: {
        Row: {
          accuracy_score: number | null
          avg_confidence: number | null
          computed_at: string
          consistency_score: number | null
          effectiveness_score: number
          entity_id: string
          entity_type: "product" | "strategy" | "policy" | "category"
          id: string
          metadata: Json | null
          outcome_success_rate: number | null
          quality_score: number | null
          sample_count: number | null
          safety_score: number | null
          version: number
        }
        Insert: {
          accuracy_score?: number | null
          avg_confidence?: number | null
          computed_at?: string
          consistency_score?: number | null
          effectiveness_score?: number
          entity_id: string
          entity_type: "product" | "strategy" | "policy" | "category"
          id?: string
          metadata?: Json | null
          outcome_success_rate?: number | null
          quality_score?: number | null
          sample_count?: number | null
          safety_score?: number | null
          version?: number
        }
        Update: {
          accuracy_score?: number | null
          avg_confidence?: number | null
          computed_at?: string
          consistency_score?: number | null
          effectiveness_score?: number
          entity_id?: string
          entity_type?: "product" | "strategy" | "policy" | "category"
          id?: string
          metadata?: Json | null
          outcome_success_rate?: number | null
          quality_score?: number | null
          sample_count?: number | null
          safety_score?: number | null
          version?: number
        }
        Relationships: []
      }
      explainability_records: {
        Row: {
          confidence_level: "low" | "medium" | "high" | "very_high"
          confidence_score: number | null
          created_at: string
          evidence_list: Json
          explanation_summary: string
          id: string
          metadata: Json | null
          pet_id: string
          policy_version: string | null
          product_id: string
          recommendation_id: string
          similar_cases: Json | null
          strategy_id: string | null
          timeline_signals: Json
        }
        Insert: {
          confidence_level?: "low" | "medium" | "high" | "very_high"
          confidence_score?: number | null
          created_at?: string
          evidence_list?: Json
          explanation_summary: string
          id?: string
          metadata?: Json | null
          pet_id: string
          policy_version?: string | null
          product_id: string
          recommendation_id: string
          similar_cases?: Json | null
          strategy_id?: string | null
          timeline_signals?: Json
        }
        Update: {
          confidence_level?: "low" | "medium" | "high" | "very_high"
          confidence_score?: number | null
          created_at?: string
          evidence_list?: Json
          explanation_summary?: string
          id?: string
          metadata?: Json | null
          pet_id?: string
          policy_version?: string | null
          product_id?: string
          recommendation_id?: string
          similar_cases?: Json | null
          strategy_id?: string | null
          timeline_signals?: Json
        }
        Relationships: []
      }
      flywheel_iterations: {
        Row: {
          attributions_computed: number | null
          benchmarks_updated: number | null
          completed_at: string | null
          data_completeness: number | null
          effectiveness_recalculated: number | null
          error_message: string | null
          evidence_quality_score: number | null
          id: string
          iteration_number: number
          metadata: Json | null
          outcomes_analyzed: number | null
          recommendations_processed: number | null
          started_at: string
          status: "running" | "completed" | "failed"
          strategy_evaluations: number | null
        }
        Insert: {
          attributions_computed?: number | null
          benchmarks_updated?: number | null
          completed_at?: string | null
          data_completeness?: number | null
          effectiveness_recalculated?: number | null
          error_message?: string | null
          evidence_quality_score?: number | null
          id?: string
          iteration_number: number
          metadata?: Json | null
          outcomes_analyzed?: number | null
          recommendations_processed?: number | null
          started_at?: string
          status?: "running" | "completed" | "failed"
          strategy_evaluations?: number | null
        }
        Update: {
          attributions_computed?: number | null
          benchmarks_updated?: number | null
          completed_at?: string | null
          data_completeness?: number | null
          effectiveness_recalculated?: number | null
          error_message?: string | null
          evidence_quality_score?: number | null
          id?: string
          iteration_number?: number
          metadata?: Json | null
          outcomes_analyzed?: number | null
          recommendations_processed?: number | null
          started_at?: string
          status?: "running" | "completed" | "failed"
          strategy_evaluations?: number | null
        }
        Relationships: []
      }
      health_benchmarks: {
        Row: {
          category: string
          computed_at: string
          confidence_interval_lower: number | null
          confidence_interval_upper: number | null
          confidence_level: number | null
          id: string
          mean_improvement: number | null
          median_days_to_improvement: number | null
          median_improvement: number | null
          metadata: Json | null
          p75_days_to_improvement: number | null
          sample_size: number
          std_deviation: number | null
          subcategory: string | null
          valid_from: string
          valid_to: string | null
          version: number
        }
        Insert: {
          category: string
          computed_at?: string
          confidence_interval_lower?: number | null
          confidence_interval_upper?: number | null
          confidence_level?: number | null
          id?: string
          mean_improvement?: number | null
          median_days_to_improvement?: number | null
          median_improvement?: number | null
          metadata?: Json | null
          p75_days_to_improvement?: number | null
          sample_size?: number
          std_deviation?: number | null
          subcategory?: string | null
          valid_from?: string
          valid_to?: string | null
          version?: number
        }
        Update: {
          category?: string
          computed_at?: string
          confidence_interval_lower?: number | null
          confidence_interval_upper?: number | null
          confidence_level?: number | null
          id?: string
          mean_improvement?: number | null
          median_days_to_improvement?: number | null
          median_improvement?: number | null
          metadata?: Json | null
          p75_days_to_improvement?: number | null
          sample_size?: number
          std_deviation?: number | null
          subcategory?: string | null
          valid_from?: string
          valid_to?: string | null
          version?: number
        }
        Relationships: []
      }
      longitudinal_outcomes: {
        Row: {
          created_at: string
          diet_stability: boolean | null
          health_score: number | null
          health_score_baseline: number | null
          health_score_delta: number | null
          horizon_days: number
          id: string
          measured_at: string
          metadata: Json | null
          outcome_class: "improved" | "stable" | "worsened" | "unknown"
          owner_adherence: number | null
          pet_id: string
          product_id: string
          symptom_count: number | null
          symptom_recurrence: number | null
        }
        Insert: {
          created_at?: string
          diet_stability?: boolean | null
          health_score?: number | null
          health_score_baseline?: number | null
          health_score_delta?: number | null
          horizon_days: number
          id?: string
          measured_at?: string
          metadata?: Json | null
          outcome_class?: "improved" | "stable" | "worsened" | "unknown"
          owner_adherence?: number | null
          pet_id: string
          product_id: string
          symptom_count?: number | null
          symptom_recurrence?: number | null
        }
        Update: {
          created_at?: string
          diet_stability?: boolean | null
          health_score?: number | null
          health_score_baseline?: number | null
          health_score_delta?: number | null
          horizon_days?: number
          id?: string
          measured_at?: string
          metadata?: Json | null
          outcome_class?: "improved" | "stable" | "worsened" | "unknown"
          owner_adherence?: number | null
          pet_id?: string
          product_id?: string
          symptom_count?: number | null
          symptom_recurrence?: number | null
        }
        Relationships: []
      }
      outcome_attribution: {
        Row: {
          contribution_bandit: number | null
          contribution_random: number | null
          contribution_segment: number | null
          contribution_strategy: number | null
          contribution_timeline: number | null
          created_at: string
          health_score_delta: number | null
          id: string
          metadata: Json | null
          outcome_confidence: number
          outcome_success: boolean
          outcome_window_days: number
          owner_adherence: number | null
          pet_id: string
          policy_version: string | null
          product_id: string
          recommendation_id: string
          segment_key: string | null
          strategy_id: string | null
          success_probability: number
          symptom_improvement: Json | null
        }
        Insert: {
          contribution_bandit?: number | null
          contribution_random?: number | null
          contribution_segment?: number | null
          contribution_strategy?: number | null
          contribution_timeline?: number | null
          created_at?: string
          health_score_delta?: number | null
          id?: string
          metadata?: Json | null
          outcome_confidence: number
          outcome_success: boolean
          outcome_window_days: number
          owner_adherence?: number | null
          pet_id: string
          policy_version?: string | null
          product_id: string
          recommendation_id: string
          segment_key?: string | null
          strategy_id?: string | null
          success_probability: number
          symptom_improvement?: Json | null
        }
        Update: {
          contribution_bandit?: number | null
          contribution_random?: number | null
          contribution_segment?: number | null
          contribution_strategy?: number | null
          contribution_timeline?: number | null
          created_at?: string
          health_score_delta?: number | null
          id?: string
          metadata?: Json | null
          outcome_confidence?: number
          outcome_success?: boolean
          outcome_window_days?: number
          owner_adherence?: number | null
          pet_id?: string
          policy_version?: string | null
          product_id?: string
          recommendation_id?: string
          segment_key?: string | null
          strategy_id?: string | null
          success_probability?: number
          symptom_improvement?: Json | null
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
    Enums: {
      activity_level_t: ["very_low", "low", "medium", "high", "very_high"],
      behavior_event_t: [
        "review_posted",
        "review_edited",
        "voucher_uploaded",
        "review_deleted",
        "rapid_posting",
        "duplicate_content",
        "suspicious_pattern",
        "account_flag",
        "community_post_published",
        "community_post_rejected",
        "community_post_auto_approved",
        "community_post_flagged",
        "community_post_restored",
      ],
      climate_type_t: [
        "tropical",
        "subtropical",
        "temperate",
        "continental",
        "arid",
        "cold",
      ],
      community_report_category_t: [
        "spam",
        "violence",
        "pornography",
        "political",
        "fraud",
        "privacy",
        "other",
      ],
      community_review_status_t: [
        "pending",
        "approved",
        "rejected",
        "auto_approved",
      ],
      daily_task_category_t: [
        "feeding",
        "water",
        "litter",
        "walk",
        "bowl_clean",
        "deworm",
        "grooming",
        "medicine",
        "other",
      ],
      daily_task_frequency_t: ["daily", "weekly", "monthly", "custom_days"],
      event_source_t: [
        "user_input",
        "ai_extraction",
        "system_generated",
        "imported",
      ],
      followup_status_t: ["pending", "reminded", "completed", "overdue"],
      ingredient_type_t: [
        "protein",
        "fat",
        "carbohydrate",
        "fiber",
        "vitamin",
        "mineral",
        "preservative",
        "additive",
        "flavoring",
        "colorant",
        "other",
      ],
      insight_type_t: [
        "product_summary",
        "risk_analysis",
        "breed_match",
        "comparison",
        "ingredient_analysis",
        "trend_prediction",
        "recommendation",
      ],
      life_stage_t: [
        "kitten",
        "young_adult",
        "adult",
        "senior",
        "geriatric",
        "super_senior",
      ],
      notification_channel_t: ["in_app", "email", "push"],
      notification_type_t: [
        "followup_reminder",
        "followup_overdue",
        "review_published",
        "trust_score_change",
        "task_reminder",
      ],
      pet_event_type_t: [
        "food_start",
        "food_stop",
        "food_switch",
        "food_amount_change",
        "symptom_observed",
        "symptom_resolved",
        "weight_change",
        "energy_change",
        "appetite_change",
        "vet_visit",
        "diagnosis",
        "medication_start",
        "medication_stop",
        "vaccination",
        "behavior_change",
        "environment_change",
        "review_posted",
        "followup_completed",
        "photo_uploaded",
      ],
      pet_gender_t: ["male", "female", "unknown"],
      pet_source_t: [
        "purchased",
        "wild_rescued",
        "home_raised",
        "stray_adopted",
        "other",
      ],
      pet_species_t: ["cat", "dog", "other"],
      risk_event_type_t: [
        "batch_abnormality",
        "formula_change",
        "dispute_surge",
        "recall",
        "quality_issue",
        "other",
      ],
      risk_level_t: ["low", "medium", "high", "critical"],
      risk_severity_t: ["low", "medium", "high", "critical"],
      risk_trend_t: ["rising", "declining", "stable"],
      stomach_health_t: ["normal", "sensitive", "very_sensitive"],
      usage_duration_t: [
        "just_started",
        "7d",
        "14d",
        "30d",
        "60d",
        "90d",
        "180d+",
        "lt_1w",
        "1w_to_2w",
        "2w_to_1m",
        "1m_to_3m",
        "m6",
        "m6_to_1y",
        "gt_1y",
        "custom",
      ],
    },
  },
} as const
