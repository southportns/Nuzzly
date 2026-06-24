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
  pflid: {
    Tables: {
      ab_assignment_log: {
        Row: {
          assigned_group: string
          created_at: string
          experiment_id: string | null
          id: string
          pet_id: string | null
          request_id: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          assigned_group: string
          created_at?: string
          experiment_id?: string | null
          id?: string
          pet_id?: string | null
          request_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_group?: string
          created_at?: string
          experiment_id?: string | null
          id?: string
          pet_id?: string | null
          request_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_assignment_log_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ab_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_experiments: {
        Row: {
          control_group: string
          created_at: string
          created_by: string | null
          description: string | null
          ended_at: string | null
          id: string
          name: string
          started_at: string | null
          status: string
          traffic_split: Json
          treatment_group: string
          updated_at: string
        }
        Insert: {
          control_group?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          name: string
          started_at?: string | null
          status?: string
          traffic_split?: Json
          treatment_group?: string
          updated_at?: string
        }
        Update: {
          control_group?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          name?: string
          started_at?: string | null
          status?: string
          traffic_split?: Json
          treatment_group?: string
          updated_at?: string
        }
        Relationships: []
      }
      adaptive_weight_snapshots: {
        Row: {
          arm_id: string
          created_at: string
          delta_max: number
          id: string
          new_weights: Json
          previous_weights: Json
          reason: string | null
          triggered_by: string
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          arm_id: string
          created_at?: string
          delta_max: number
          id?: string
          new_weights: Json
          previous_weights: Json
          reason?: string | null
          triggered_by?: string
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          arm_id?: string
          created_at?: string
          delta_max?: number
          id?: string
          new_weights?: Json
          previous_weights?: Json
          reason?: string | null
          triggered_by?: string
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adaptive_weight_snapshots_arm_id_fkey"
            columns: ["arm_id"]
            isOneToOne: false
            referencedRelation: "bandit_arms"
            referencedColumns: ["arm_id"]
          },
        ]
      }
      arm_exposure_log: {
        Row: {
          arm_id: string
          bucket_start: string
          exposure_count: number
          last_updated_at: string
          segment: string
        }
        Insert: {
          arm_id: string
          bucket_start: string
          exposure_count?: number
          last_updated_at?: string
          segment?: string
        }
        Update: {
          arm_id?: string
          bucket_start?: string
          exposure_count?: number
          last_updated_at?: string
          segment?: string
        }
        Relationships: [
          {
            foreignKeyName: "arm_exposure_log_arm_id_fkey"
            columns: ["arm_id"]
            isOneToOne: false
            referencedRelation: "bandit_arms"
            referencedColumns: ["arm_id"]
          },
        ]
      }
      bandit_arms: {
        Row: {
          arm_id: string
          arm_name: string
          created_at: string
          description: string | null
          eligibility_rules: Json
          is_active: boolean
          scoring_engine: string
          updated_at: string
          weight_config: Json
        }
        Insert: {
          arm_id: string
          arm_name: string
          created_at?: string
          description?: string | null
          eligibility_rules?: Json
          is_active?: boolean
          scoring_engine: string
          updated_at?: string
          weight_config?: Json
        }
        Update: {
          arm_id?: string
          arm_name?: string
          created_at?: string
          description?: string | null
          eligibility_rules?: Json
          is_active?: boolean
          scoring_engine?: string
          updated_at?: string
          weight_config?: Json
        }
        Relationships: []
      }
      bandit_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input_payload: Json
          job_type: string
          result_payload: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_payload?: Json
          job_type: string
          result_payload?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_payload?: Json
          job_type?: string
          result_payload?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      bandit_rewards: {
        Row: {
          arm_id: string
          created_at: string
          id: string
          request_id: string
          reward: number
          reward_components: Json
          segment: string
          session_id: string | null
          trace_id: string | null
          user_id: string | null
        }
        Insert: {
          arm_id: string
          created_at?: string
          id?: string
          request_id: string
          reward: number
          reward_components?: Json
          segment?: string
          session_id?: string | null
          trace_id?: string | null
          user_id?: string | null
        }
        Update: {
          arm_id?: string
          created_at?: string
          id?: string
          request_id?: string
          reward?: number
          reward_components?: Json
          segment?: string
          session_id?: string | null
          trace_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bandit_rewards_arm_id_fkey"
            columns: ["arm_id"]
            isOneToOne: false
            referencedRelation: "bandit_arms"
            referencedColumns: ["arm_id"]
          },
        ]
      }
      bandit_state: {
        Row: {
          alpha: number
          arm_id: string
          beta: number
          cumulative_regret: number
          last_pulled_at: string | null
          last_updated_at: string
          segment: string
          total_pulls: number
          total_reward: number
        }
        Insert: {
          alpha?: number
          arm_id: string
          beta?: number
          cumulative_regret?: number
          last_pulled_at?: string | null
          last_updated_at?: string
          segment?: string
          total_pulls?: number
          total_reward?: number
        }
        Update: {
          alpha?: number
          arm_id?: string
          beta?: number
          cumulative_regret?: number
          last_pulled_at?: string | null
          last_updated_at?: string
          segment?: string
          total_pulls?: number
          total_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "bandit_state_arm_id_fkey"
            columns: ["arm_id"]
            isOneToOne: false
            referencedRelation: "bandit_arms"
            referencedColumns: ["arm_id"]
          },
        ]
      }
      bootstrap_results: {
        Row: {
          analysis_id: string
          bootstrap_mean: number
          bootstrap_std: number
          ci_level: number | null
          ci_lower: number
          ci_upper: number
          computed_at: string
          effect_size: number | null
          id: string
          iterations: number
          metric_name: string
          observed_value: number
        }
        Insert: {
          analysis_id: string
          bootstrap_mean: number
          bootstrap_std: number
          ci_level?: number | null
          ci_lower: number
          ci_upper: number
          computed_at?: string
          effect_size?: number | null
          id?: string
          iterations: number
          metric_name: string
          observed_value: number
        }
        Update: {
          analysis_id?: string
          bootstrap_mean?: number
          bootstrap_std?: number
          ci_level?: number | null
          ci_lower?: number
          ci_upper?: number
          computed_at?: string
          effect_size?: number | null
          id?: string
          iterations?: number
          metric_name?: string
          observed_value?: number
        }
        Relationships: []
      }
      causal_analysis_results: {
        Row: {
          analysis_id: string
          anomaly_signals: Json | null
          bootstrap_iterations: number | null
          bootstrap_mean: number | null
          bootstrap_std: number | null
          confidence: number | null
          confidence_interval_lower: number | null
          confidence_interval_upper: number | null
          control_dimensions: Json | null
          correlated_changes: Json | null
          created_at: string
          effect_size: number | null
          effect_size_cohens_d: number | null
          effect_size_interpretation: string | null
          hypothesis: string
          id: string
          p_value: number | null
          statistical_method: string | null
          supporting_traces: Json | null
        }
        Insert: {
          analysis_id: string
          anomaly_signals?: Json | null
          bootstrap_iterations?: number | null
          bootstrap_mean?: number | null
          bootstrap_std?: number | null
          confidence?: number | null
          confidence_interval_lower?: number | null
          confidence_interval_upper?: number | null
          control_dimensions?: Json | null
          correlated_changes?: Json | null
          created_at?: string
          effect_size?: number | null
          effect_size_cohens_d?: number | null
          effect_size_interpretation?: string | null
          hypothesis: string
          id?: string
          p_value?: number | null
          statistical_method?: string | null
          supporting_traces?: Json | null
        }
        Update: {
          analysis_id?: string
          anomaly_signals?: Json | null
          bootstrap_iterations?: number | null
          bootstrap_mean?: number | null
          bootstrap_std?: number | null
          confidence?: number | null
          confidence_interval_lower?: number | null
          confidence_interval_upper?: number | null
          control_dimensions?: Json | null
          correlated_changes?: Json | null
          created_at?: string
          effect_size?: number | null
          effect_size_cohens_d?: number | null
          effect_size_interpretation?: string | null
          hypothesis?: string
          id?: string
          p_value?: number | null
          statistical_method?: string | null
          supporting_traces?: Json | null
        }
        Relationships: []
      }
      causal_confounders: {
        Row: {
          analysis_id: string
          confounder_bucket: string
          confounder_type: string
          created_at: string
          delta: number | null
          group_a_avg: number | null
          group_b_avg: number | null
          id: string
          sample_size: number | null
        }
        Insert: {
          analysis_id: string
          confounder_bucket: string
          confounder_type: string
          created_at?: string
          delta?: number | null
          group_a_avg?: number | null
          group_b_avg?: number | null
          id?: string
          sample_size?: number | null
        }
        Update: {
          analysis_id?: string
          confounder_bucket?: string
          confounder_type?: string
          created_at?: string
          delta?: number | null
          group_a_avg?: number | null
          group_b_avg?: number | null
          id?: string
          sample_size?: number | null
        }
        Relationships: []
      }
      counterfactual_estimates: {
        Row: {
          arm_id: string
          baseline_arm_id: string
          computed_at: string
          expected_lift: number | null
          id: string
          ips_ci_lower: number | null
          ips_ci_upper: number | null
          ips_estimate: number
          ips_std: number | null
          job_id: string | null
          propensity_score: number | null
          sample_size: number
          statistical_method: string
          window_end: string
          window_start: string
        }
        Insert: {
          arm_id: string
          baseline_arm_id: string
          computed_at?: string
          expected_lift?: number | null
          id?: string
          ips_ci_lower?: number | null
          ips_ci_upper?: number | null
          ips_estimate: number
          ips_std?: number | null
          job_id?: string | null
          propensity_score?: number | null
          sample_size: number
          statistical_method?: string
          window_end: string
          window_start: string
        }
        Update: {
          arm_id?: string
          baseline_arm_id?: string
          computed_at?: string
          expected_lift?: number | null
          id?: string
          ips_ci_lower?: number | null
          ips_ci_upper?: number | null
          ips_estimate?: number
          ips_std?: number | null
          job_id?: string | null
          propensity_score?: number | null
          sample_size?: number
          statistical_method?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "counterfactual_estimates_arm_id_fkey"
            columns: ["arm_id"]
            isOneToOne: false
            referencedRelation: "bandit_arms"
            referencedColumns: ["arm_id"]
          },
        ]
      }
      decision_trace_log: {
        Row: {
          ab_group: string | null
          compressed: boolean | null
          compression_strategy: string | null
          created_at: string
          decision_path: string
          feature_flags_snapshot: Json | null
          final_score_source: string | null
          hash_bucket: number | null
          hash_source: string | null
          id: string
          latency_ms: number | null
          product_scores: Json | null
          ranking_output: Json | null
          replayable: boolean | null
          request_id: string | null
          rollout_percent: number | null
          scoring_inputs: Json | null
          scoring_path_steps: Json | null
          storage_tier: string | null
          trace_size_bytes: number | null
          user_id: string | null
        }
        Insert: {
          ab_group?: string | null
          compressed?: boolean | null
          compression_strategy?: string | null
          created_at?: string
          decision_path: string
          feature_flags_snapshot?: Json | null
          final_score_source?: string | null
          hash_bucket?: number | null
          hash_source?: string | null
          id?: string
          latency_ms?: number | null
          product_scores?: Json | null
          ranking_output?: Json | null
          replayable?: boolean | null
          request_id?: string | null
          rollout_percent?: number | null
          scoring_inputs?: Json | null
          scoring_path_steps?: Json | null
          storage_tier?: string | null
          trace_size_bytes?: number | null
          user_id?: string | null
        }
        Update: {
          ab_group?: string | null
          compressed?: boolean | null
          compression_strategy?: string | null
          created_at?: string
          decision_path?: string
          feature_flags_snapshot?: Json | null
          final_score_source?: string | null
          hash_bucket?: number | null
          hash_source?: string | null
          id?: string
          latency_ms?: number | null
          product_scores?: Json | null
          ranking_output?: Json | null
          replayable?: boolean | null
          request_id?: string | null
          rollout_percent?: number | null
          scoring_inputs?: Json | null
          scoring_path_steps?: Json | null
          storage_tier?: string | null
          trace_size_bytes?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      delayed_rewards: {
        Row: {
          applied_at: string | null
          applied_to_bandit: boolean
          arm_id: string
          created_at: string
          event_type: string
          event_value: number
          id: string
          lookback_days: number
          request_id: string
          segment: string
          session_id: string | null
          user_id: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          applied_at?: string | null
          applied_to_bandit?: boolean
          arm_id: string
          created_at?: string
          event_type: string
          event_value: number
          id?: string
          lookback_days: number
          request_id: string
          segment?: string
          session_id?: string | null
          user_id?: string | null
          window_end: string
          window_start: string
        }
        Update: {
          applied_at?: string | null
          applied_to_bandit?: boolean
          arm_id?: string
          created_at?: string
          event_type?: string
          event_value?: number
          id?: string
          lookback_days?: number
          request_id?: string
          segment?: string
          session_id?: string | null
          user_id?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "delayed_rewards_arm_id_fkey"
            columns: ["arm_id"]
            isOneToOne: false
            referencedRelation: "bandit_arms"
            referencedColumns: ["arm_id"]
          },
        ]
      }
      embeddings_metadata: {
        Row: {
          chunk_index: number | null
          created_at: string
          embedding_model: string
          embedding_version: string | null
          expires_at: string | null
          id: string
          last_indexed_at: string | null
          metadata: Json | null
          qdrant_collection: string
          qdrant_point_id: string | null
          source_id: string
          source_type: string
          token_count: number | null
          total_chunks: number | null
          vector_dim: number
        }
        Insert: {
          chunk_index?: number | null
          created_at?: string
          embedding_model: string
          embedding_version?: string | null
          expires_at?: string | null
          id?: string
          last_indexed_at?: string | null
          metadata?: Json | null
          qdrant_collection: string
          qdrant_point_id?: string | null
          source_id: string
          source_type: string
          token_count?: number | null
          total_chunks?: number | null
          vector_dim: number
        }
        Update: {
          chunk_index?: number | null
          created_at?: string
          embedding_model?: string
          embedding_version?: string | null
          expires_at?: string | null
          id?: string
          last_indexed_at?: string | null
          metadata?: Json | null
          qdrant_collection?: string
          qdrant_point_id?: string | null
          source_id?: string
          source_type?: string
          token_count?: number | null
          total_chunks?: number | null
          vector_dim?: number
        }
        Relationships: []
      }
      exploration_safety_log: {
        Row: {
          affected_arms: string[] | null
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          reason: string | null
          threshold_value: number | null
          trigger_metric: string | null
          trigger_value: number | null
        }
        Insert: {
          affected_arms?: string[] | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          reason?: string | null
          threshold_value?: number | null
          trigger_metric?: string | null
          trigger_value?: number | null
        }
        Update: {
          affected_arms?: string[] | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          reason?: string | null
          threshold_value?: number | null
          trigger_metric?: string | null
          trigger_value?: number | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          environment: string
          flag_key: string
          flag_value: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          environment?: string
          flag_key: string
          flag_value?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          environment?: string
          flag_key?: string
          flag_value?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      followups: {
        Row: {
          completed_at: string | null
          continued_usage: boolean | null
          created_at: string
          followup_day: number
          health_changes: Json | null
          id: string
          note: string | null
          profile_id: string
          repurchase_status: string | null
          review_id: string
          satisfaction: number | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          continued_usage?: boolean | null
          created_at?: string
          followup_day: number
          health_changes?: Json | null
          id?: string
          note?: string | null
          profile_id: string
          repurchase_status?: string | null
          review_id: string
          satisfaction?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          continued_usage?: boolean | null
          created_at?: string
          followup_day?: number
          health_changes?: Json | null
          id?: string
          note?: string | null
          profile_id?: string
          repurchase_status?: string | null
          review_id?: string
          satisfaction?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followups_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      product_score_comparison: {
        Row: {
          calculated_at: string
          created_at: string
          delta_percent: number | null
          id: string
          product_id: string
          review_score: number | null
          score_delta: number | null
          timeline_score: number | null
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          delta_percent?: number | null
          id?: string
          product_id: string
          review_score?: number | null
          score_delta?: number | null
          timeline_score?: number | null
        }
        Update: {
          calculated_at?: string
          created_at?: string
          delta_percent?: number | null
          id?: string
          product_id?: string
          review_score?: number | null
          score_delta?: number | null
          timeline_score?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          ash_percent: number | null
          breed_diversity: number | null
          carbohydrate_est: number | null
          country_of_origin: string | null
          created_at: string
          fat_percent: number | null
          fiber_percent: number | null
          grain_free: boolean | null
          id: string
          ingredient_list: Json | null
          life_stage: string | null
          long_term_stability: number | null
          metadata: Json | null
          moisture_percent: number | null
          price_range: string | null
          product_id: string
          protein_percent: number | null
          repurchase_trend: number | null
          risk_index: number | null
          stool_safety_score: number | null
          total_reviews_30d: number | null
          updated_at: string
        }
        Insert: {
          ash_percent?: number | null
          breed_diversity?: number | null
          carbohydrate_est?: number | null
          country_of_origin?: string | null
          created_at?: string
          fat_percent?: number | null
          fiber_percent?: number | null
          grain_free?: boolean | null
          id?: string
          ingredient_list?: Json | null
          life_stage?: string | null
          long_term_stability?: number | null
          metadata?: Json | null
          moisture_percent?: number | null
          price_range?: string | null
          product_id: string
          protein_percent?: number | null
          repurchase_trend?: number | null
          risk_index?: number | null
          stool_safety_score?: number | null
          total_reviews_30d?: number | null
          updated_at?: string
        }
        Update: {
          ash_percent?: number | null
          breed_diversity?: number | null
          carbohydrate_est?: number | null
          country_of_origin?: string | null
          created_at?: string
          fat_percent?: number | null
          fiber_percent?: number | null
          grain_free?: boolean | null
          id?: string
          ingredient_list?: Json | null
          life_stage?: string | null
          long_term_stability?: number | null
          metadata?: Json | null
          moisture_percent?: number | null
          price_range?: string | null
          product_id?: string
          protein_percent?: number | null
          repurchase_trend?: number | null
          risk_index?: number | null
          stool_safety_score?: number | null
          total_reviews_30d?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      propensity_calibration: {
        Row: {
          arm_id: string
          calibration_ratio: number
          computed_at: string
          id: string
          intended_propensity: number
          observed_propensity: number
          period_end: string
          period_start: string
          sample_size: number
          segment: string
        }
        Insert: {
          arm_id: string
          calibration_ratio: number
          computed_at?: string
          id?: string
          intended_propensity: number
          observed_propensity: number
          period_end: string
          period_start: string
          sample_size: number
          segment?: string
        }
        Update: {
          arm_id?: string
          calibration_ratio?: number
          computed_at?: string
          id?: string
          intended_propensity?: number
          observed_propensity?: number
          period_end?: string
          period_start?: string
          sample_size?: number
          segment?: string
        }
        Relationships: [
          {
            foreignKeyName: "propensity_calibration_arm_id_fkey"
            columns: ["arm_id"]
            isOneToOne: false
            referencedRelation: "bandit_arms"
            referencedColumns: ["arm_id"]
          },
        ]
      }
      replay_jobs: {
        Row: {
          causal_result: Json | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          diff_result: Json | null
          duration_ms: number | null
          error_message: string | null
          execution_fidelity: string | null
          fidelity_warnings: Json | null
          id: string
          idempotency_key: string | null
          job_type: string
          original_trace: Json | null
          replay_config: Json
          replayed_trace: Json | null
          request_id: string | null
          root_cause_result: Json | null
          started_at: string | null
          status: string
          time_range_end: string | null
          time_range_start: string | null
          user_id: string | null
        }
        Insert: {
          causal_result?: Json | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          diff_result?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          execution_fidelity?: string | null
          fidelity_warnings?: Json | null
          id?: string
          idempotency_key?: string | null
          job_type: string
          original_trace?: Json | null
          replay_config?: Json
          replayed_trace?: Json | null
          request_id?: string | null
          root_cause_result?: Json | null
          started_at?: string | null
          status?: string
          time_range_end?: string | null
          time_range_start?: string | null
          user_id?: string | null
        }
        Update: {
          causal_result?: Json | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          diff_result?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          execution_fidelity?: string | null
          fidelity_warnings?: Json | null
          id?: string
          idempotency_key?: string | null
          job_type?: string
          original_trace?: Json | null
          replay_config?: Json
          replayed_trace?: Json | null
          request_id?: string | null
          root_cause_result?: Json | null
          started_at?: string | null
          status?: string
          time_range_end?: string | null
          time_range_start?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      replay_snapshots: {
        Row: {
          ab_assignment: Json | null
          created_at: string
          diff_compressed: boolean | null
          diff_summary: Json | null
          feature_flags: Json
          final_ranking: Json
          id: string
          pet_id: string | null
          request_id: string | null
          review_scores: Json
          rollout_state: Json
          scoring_metadata: Json | null
          snapshot_key: string
          snapshot_size_bytes: number | null
          storage_tier: string | null
          timeline_scores: Json
          user_id: string | null
        }
        Insert: {
          ab_assignment?: Json | null
          created_at?: string
          diff_compressed?: boolean | null
          diff_summary?: Json | null
          feature_flags?: Json
          final_ranking?: Json
          id?: string
          pet_id?: string | null
          request_id?: string | null
          review_scores?: Json
          rollout_state?: Json
          scoring_metadata?: Json | null
          snapshot_key: string
          snapshot_size_bytes?: number | null
          storage_tier?: string | null
          timeline_scores?: Json
          user_id?: string | null
        }
        Update: {
          ab_assignment?: Json | null
          created_at?: string
          diff_compressed?: boolean | null
          diff_summary?: Json | null
          feature_flags?: Json
          final_ranking?: Json
          id?: string
          pet_id?: string | null
          request_id?: string | null
          review_scores?: Json
          rollout_state?: Json
          scoring_metadata?: Json | null
          snapshot_key?: string
          snapshot_size_bytes?: number | null
          storage_tier?: string | null
          timeline_scores?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      review_fingerprints: {
        Row: {
          author_id: string
          content_hash: string
          created_at: string
          duplicate_of: string | null
          duplicate_score: number | null
          id: string
          is_duplicate: boolean | null
          metadata: Json | null
          pflid_review_id: string | null
          product_id: string
          review_id: string
          simhash: string | null
        }
        Insert: {
          author_id: string
          content_hash: string
          created_at?: string
          duplicate_of?: string | null
          duplicate_score?: number | null
          id?: string
          is_duplicate?: boolean | null
          metadata?: Json | null
          pflid_review_id?: string | null
          product_id: string
          review_id: string
          simhash?: string | null
        }
        Update: {
          author_id?: string
          content_hash?: string
          created_at?: string
          duplicate_of?: string | null
          duplicate_score?: number | null
          id?: string
          is_duplicate?: boolean | null
          metadata?: Json | null
          pflid_review_id?: string | null
          product_id?: string
          review_id?: string
          simhash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_fingerprints_pflid_review_id_fkey"
            columns: ["pflid_review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_timeline_events: {
        Row: {
          confidence: number | null
          created_at: string
          event_day: number
          event_type: string
          extracted_text: string | null
          extraction_model: string | null
          id: string
          metadata: Json | null
          review_id: string | null
          sentiment: string | null
          sentiment_score: number | null
          source_review_id: string | null
          status: string | null
          symptom: string | null
          symptom_severity: number | null
          timeline_group_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          event_day: number
          event_type?: string
          extracted_text?: string | null
          extraction_model?: string | null
          id?: string
          metadata?: Json | null
          review_id?: string | null
          sentiment?: string | null
          sentiment_score?: number | null
          source_review_id?: string | null
          status?: string | null
          symptom?: string | null
          symptom_severity?: number | null
          timeline_group_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          event_day?: number
          event_type?: string
          extracted_text?: string | null
          extraction_model?: string | null
          id?: string
          metadata?: Json | null
          review_id?: string | null
          sentiment?: string | null
          sentiment_score?: number | null
          source_review_id?: string | null
          status?: string | null
          symptom?: string | null
          symptom_severity?: number | null
          timeline_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_timeline_events_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_timeline_events_timeline_group_id_fkey"
            columns: ["timeline_group_id"]
            isOneToOne: false
            referencedRelation: "review_timeline_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      review_timeline_groups: {
        Row: {
          author_id: string
          created_at: string
          first_review_date: string
          has_opinion_change: boolean | null
          has_photos: boolean | null
          has_repurchase: boolean | null
          id: string
          is_active: boolean | null
          last_review_date: string
          metadata: Json | null
          product_id: string
          review_count: number
          timeline_score: number | null
          total_days_span: number | null
          trust_factors: Json | null
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          first_review_date: string
          has_opinion_change?: boolean | null
          has_photos?: boolean | null
          has_repurchase?: boolean | null
          id?: string
          is_active?: boolean | null
          last_review_date: string
          metadata?: Json | null
          product_id: string
          review_count?: number
          timeline_score?: number | null
          total_days_span?: number | null
          trust_factors?: Json | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          first_review_date?: string
          has_opinion_change?: boolean | null
          has_photos?: boolean | null
          has_repurchase?: boolean | null
          id?: string
          is_active?: boolean | null
          last_review_date?: string
          metadata?: Json | null
          product_id?: string
          review_count?: number
          timeline_score?: number | null
          total_days_span?: number | null
          trust_factors?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      review_timelines: {
        Row: {
          created_at: string
          id: string
          month_index: number
          notes: string | null
          product_id: string
          review_id: string
          status: string
          symptoms: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          month_index: number
          notes?: string | null
          product_id: string
          review_id: string
          status: string
          symptoms?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          month_index?: number
          notes?: string | null
          product_id?: string
          review_id?: string
          status?: string
          symptoms?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "review_timelines_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_to_timeline: {
        Row: {
          created_at: string
          id: string
          pflid_review_id: string | null
          review_date: string
          review_order: number
          source_review_id: string
          timeline_group_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pflid_review_id?: string | null
          review_date: string
          review_order?: number
          source_review_id: string
          timeline_group_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pflid_review_id?: string | null
          review_date?: string
          review_order?: number
          source_review_id?: string
          timeline_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_to_timeline_pflid_review_id_fkey"
            columns: ["pflid_review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_to_timeline_timeline_group_id_fkey"
            columns: ["timeline_group_id"]
            isOneToOne: false
            referencedRelation: "review_timeline_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          extracted_symptoms: Json | null
          extraction_at: string | null
          extraction_version: string | null
          followup_days: number | null
          id: string
          is_followup: boolean | null
          product_id: string
          rating: number | null
          raw_json_path: string | null
          raw_review_text: string
          review_date: string | null
          review_id: string | null
          sentiment: string | null
          sentiment_score: number | null
          source_platform: string
          source_url: string | null
          timeline_data: Json | null
          trust_flags: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          extracted_symptoms?: Json | null
          extraction_at?: string | null
          extraction_version?: string | null
          followup_days?: number | null
          id?: string
          is_followup?: boolean | null
          product_id: string
          rating?: number | null
          raw_json_path?: string | null
          raw_review_text: string
          review_date?: string | null
          review_id?: string | null
          sentiment?: string | null
          sentiment_score?: number | null
          source_platform?: string
          source_url?: string | null
          timeline_data?: Json | null
          trust_flags?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          extracted_symptoms?: Json | null
          extraction_at?: string | null
          extraction_version?: string | null
          followup_days?: number | null
          id?: string
          is_followup?: boolean | null
          product_id?: string
          rating?: number | null
          raw_json_path?: string | null
          raw_review_text?: string
          review_date?: string | null
          review_id?: string | null
          sentiment?: string | null
          sentiment_score?: number | null
          source_platform?: string
          source_url?: string | null
          timeline_data?: Json | null
          trust_flags?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      risk_events: {
        Row: {
          affected_reviews: number | null
          created_at: string
          description: string | null
          detection_source: string | null
          event_date: string
          id: string
          metadata: Json | null
          product_id: string
          resolution_status: string
          resolved_at: string | null
          risk_category: string
          risk_event_id: string | null
          severity: string
          title: string
          trend: string
          updated_at: string
        }
        Insert: {
          affected_reviews?: number | null
          created_at?: string
          description?: string | null
          detection_source?: string | null
          event_date?: string
          id?: string
          metadata?: Json | null
          product_id: string
          resolution_status?: string
          resolved_at?: string | null
          risk_category: string
          risk_event_id?: string | null
          severity?: string
          title: string
          trend?: string
          updated_at?: string
        }
        Update: {
          affected_reviews?: number | null
          created_at?: string
          description?: string | null
          detection_source?: string | null
          event_date?: string
          id?: string
          metadata?: Json | null
          product_id?: string
          resolution_status?: string
          resolved_at?: string | null
          risk_category?: string
          risk_event_id?: string | null
          severity?: string
          title?: string
          trend?: string
          updated_at?: string
        }
        Relationships: []
      }
      rollout_event_log: {
        Row: {
          created_at: string
          event_type: string
          id: string
          new_value: Json | null
          previous_value: Json | null
          reason: string | null
          triggered_by: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string | null
          triggered_by?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string | null
          triggered_by?: string
        }
        Relationships: []
      }
      rollout_state: {
        Row: {
          active_experiment_id: string | null
          created_at: string
          current_phase: string
          id: string
          last_rollback_at: string | null
          last_rollback_reason: string | null
          rollback_count: number | null
          timeline_traffic_pct: number
          updated_at: string
        }
        Insert: {
          active_experiment_id?: string | null
          created_at?: string
          current_phase?: string
          id?: string
          last_rollback_at?: string | null
          last_rollback_reason?: string | null
          rollback_count?: number | null
          timeline_traffic_pct?: number
          updated_at?: string
        }
        Update: {
          active_experiment_id?: string | null
          created_at?: string
          current_phase?: string
          id?: string
          last_rollback_at?: string | null
          last_rollback_reason?: string | null
          rollback_count?: number | null
          timeline_traffic_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      strategy_performance_history: {
        Row: {
          arm_id: string
          conversion_rate: number | null
          ctr: number | null
          dwell_time_ms: number | null
          exploration_rate: number | null
          id: string
          mean_reward: number
          pulls: number
          recorded_at: string
          reward_std: number | null
          sample_size: number
          skip_rate: number | null
          strategy_id: string
          window_end: string
          window_start: string
        }
        Insert: {
          arm_id: string
          conversion_rate?: number | null
          ctr?: number | null
          dwell_time_ms?: number | null
          exploration_rate?: number | null
          id?: string
          mean_reward: number
          pulls: number
          recorded_at?: string
          reward_std?: number | null
          sample_size: number
          skip_rate?: number | null
          strategy_id: string
          window_end: string
          window_start: string
        }
        Update: {
          arm_id?: string
          conversion_rate?: number | null
          ctr?: number | null
          dwell_time_ms?: number | null
          exploration_rate?: number | null
          id?: string
          mean_reward?: number
          pulls?: number
          recorded_at?: string
          reward_std?: number | null
          sample_size?: number
          skip_rate?: number | null
          strategy_id?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_performance_history_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategy_registry"
            referencedColumns: ["strategy_id"]
          },
        ]
      }
      strategy_registry: {
        Row: {
          arm_id: string
          created_at: string
          created_by: string | null
          description: string | null
          eligibility_rules: Json
          name: string
          parent_strategy_id: string | null
          retired_at: string | null
          rollout_constraints: Json
          status: string
          strategy_id: string
          version: string
          weight_config: Json
        }
        Insert: {
          arm_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          eligibility_rules?: Json
          name: string
          parent_strategy_id?: string | null
          retired_at?: string | null
          rollout_constraints?: Json
          status?: string
          strategy_id?: string
          version: string
          weight_config?: Json
        }
        Update: {
          arm_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          eligibility_rules?: Json
          name?: string
          parent_strategy_id?: string | null
          retired_at?: string | null
          rollout_constraints?: Json
          status?: string
          strategy_id?: string
          version?: string
          weight_config?: Json
        }
        Relationships: [
          {
            foreignKeyName: "strategy_registry_arm_id_fkey"
            columns: ["arm_id"]
            isOneToOne: false
            referencedRelation: "bandit_arms"
            referencedColumns: ["arm_id"]
          },
          {
            foreignKeyName: "strategy_registry_parent_strategy_id_fkey"
            columns: ["parent_strategy_id"]
            isOneToOne: false
            referencedRelation: "strategy_registry"
            referencedColumns: ["strategy_id"]
          },
        ]
      }
      structured_symptoms: {
        Row: {
          confidence_score: number | null
          context_snippet: string | null
          created_at: string
          detected_by: string
          id: string
          product_id: string
          review_id: string
          severity: number | null
          symptom_type: string
        }
        Insert: {
          confidence_score?: number | null
          context_snippet?: string | null
          created_at?: string
          detected_by?: string
          id?: string
          product_id: string
          review_id: string
          severity?: number | null
          symptom_type: string
        }
        Update: {
          confidence_score?: number | null
          context_snippet?: string | null
          created_at?: string
          detected_by?: string
          id?: string
          product_id?: string
          review_id?: string
          severity?: number | null
          symptom_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "structured_symptoms_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_metrics_daily: {
        Row: {
          black_chin_rate: number | null
          created_at: string
          day180_stability_rate: number | null
          day30_stability_rate: number | null
          day90_stability_rate: number | null
          id: string
          product_id: string
          repurchase_rate: number | null
          soft_stool_rate: number | null
          stat_date: string
          timeline_count: number | null
          trust_weighted_score: number | null
          vomiting_rate: number | null
        }
        Insert: {
          black_chin_rate?: number | null
          created_at?: string
          day180_stability_rate?: number | null
          day30_stability_rate?: number | null
          day90_stability_rate?: number | null
          id?: string
          product_id: string
          repurchase_rate?: number | null
          soft_stool_rate?: number | null
          stat_date?: string
          timeline_count?: number | null
          trust_weighted_score?: number | null
          vomiting_rate?: number | null
        }
        Update: {
          black_chin_rate?: number | null
          created_at?: string
          day180_stability_rate?: number | null
          day30_stability_rate?: number | null
          day90_stability_rate?: number | null
          id?: string
          product_id?: string
          repurchase_rate?: number | null
          soft_stool_rate?: number | null
          stat_date?: string
          timeline_count?: number | null
          trust_weighted_score?: number | null
          vomiting_rate?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      replay_health_summary: {
        Row: {
          avg_duration_ms: number | null
          execution_fidelity: string | null
          max_duration_ms: number | null
          replay_count: number | null
        }
        Relationships: []
      }
      trace_storage_distribution: {
        Row: {
          avg_size_bytes: number | null
          storage_tier: string | null
          total_size_bytes: number | null
          trace_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      arm_exposure_bump: {
        Args: { p_arm_id: string; p_bucket_start: string; p_segment: string }
        Returns: undefined
      }
      backfill_score_comparison: { Args: never; Returns: number }
      backfill_timeline_groups: {
        Args: { p_author_id?: string; p_product_id?: string }
        Returns: number
      }
      backfill_timeline_metrics: {
        Args: { p_days_back?: number }
        Returns: number
      }
      bandit_select_arm: {
        Args: {
          p_candidate_arms: string[]
          p_random_seed?: number
          p_segment?: string
        }
        Returns: {
          alpha: number
          arm_id: string
          beta: number
          sampled_value: number
        }[]
      }
      build_outcome_dataset: { Args: { p_limit?: number }; Returns: Json }
      build_outcome_sample: {
        Args: { p_pet_id: string; p_product_id: string }
        Returns: Json
      }
      build_review_fingerprint: {
        Args: {
          p_author_id: string
          p_product_id: string
          p_review_id: string
          p_review_text: string
        }
        Returns: string
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
      calculate_longitudinal_score: {
        Args: { p_product_id: string }
        Returns: Json
      }
      calculate_score_comparison: {
        Args: { p_product_id: string }
        Returns: Json
      }
      calculate_timeline_trust_score: {
        Args: { p_timeline_group_id: string }
        Returns: number
      }
      compute_simhash: { Args: { p_text: string }; Returns: string }
      execute_rollback: { Args: { p_reason?: string }; Returns: Json }
      generate_timeline_metrics: {
        Args: { p_product_id: string; p_stat_date?: string }
        Returns: Json
      }
      get_feature_flag: {
        Args: { p_environment?: string; p_flag_key: string }
        Returns: Json
      }
      get_outcome_intel: { Args: { p_product_id: string }; Returns: Json }
      get_product_timeline_stats: {
        Args: { p_product_id: string }
        Returns: Json
      }
      get_rollout_status: { Args: never; Returns: Json }
      get_score_comparison_report: { Args: { p_limit?: number }; Returns: Json }
      hamming_distance: {
        Args: { hash1: string; hash2: string }
        Returns: number
      }
      incremental_outcome_dataset: { Args: { p_since?: string }; Returns: Json }
      match_outcome_for_pet: {
        Args: {
          p_age: number
          p_breed: string
          p_limit?: number
          p_sensitive_gut: boolean
          p_sterilized: boolean
          p_symptoms?: string[]
        }
        Returns: {
          black_chin_risk: number
          brand: string
          confidence: number
          decay_curve: Json
          longitudinal_score: number
          matched_timelines: number
          product_id: string
          product_name: string
          repurchase_rate: number
          soft_stool_risk: number
          stability_rate: number
          vomiting_risk: number
        }[]
      }
      recommend_food_by_outcome: {
        Args: { p_limit?: number; p_pet_id: string }
        Returns: Json
      }
      score_product_for_pet_timeline: {
        Args: { p_pet_id: string; p_product_id: string }
        Returns: Json
      }
      tier_decision_traces: { Args: never; Returns: undefined }
      update_feature_flag: {
        Args: { p_environment?: string; p_flag_key: string; p_flag_value: Json }
        Returns: Json
      }
      update_rollout_percentage: {
        Args: { p_percentage: number; p_reason?: string }
        Returns: Json
      }
      upsert_timeline_events: {
        Args: {
          p_events: Json
          p_review_id: string
          p_source_review_id: string
          p_timeline_group_id: string
        }
        Returns: number
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
            foreignKeyName: "environment_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "health_chat_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "health_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        ]
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
            foreignKeyName: "pet_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        ]
      }
      pets: {
        Row: {
          age_days: number
          age_months: number
          age_years: number
          birth_date: string | null
          breed: string | null
          created_at: string
          disease_history: string | null
          environment_id: string | null
          gender: Database["public"]["Enums"]["pet_gender_t"]
          home_age_days: number
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
          age_days?: number
          age_months?: number
          age_years?: number
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          disease_history?: string | null
          environment_id?: string | null
          gender?: Database["public"]["Enums"]["pet_gender_t"]
          home_age_days?: number
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
          age_days?: number
          age_months?: number
          age_years?: number
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          disease_history?: string | null
          environment_id?: string | null
          gender?: Database["public"]["Enums"]["pet_gender_t"]
          home_age_days?: number
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
          created_at: string
          display_name: string | null
          flag_reason: string | null
          id: string
          is_admin: boolean
          is_flagged: boolean | null
          long_term_review_count: number | null
          pet_profile_completeness: number | null
          review_count: number | null
          trust_score: number | null
          updated_at: string
          username: string
          verified_purchase_count: number | null
        }
        Insert: {
          avatar_url?: string | null
          behavior_score?: number | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          flag_reason?: string | null
          id: string
          is_admin?: boolean
          is_flagged?: boolean | null
          long_term_review_count?: number | null
          pet_profile_completeness?: number | null
          review_count?: number | null
          trust_score?: number | null
          updated_at?: string
          username: string
          verified_purchase_count?: number | null
        }
        Update: {
          avatar_url?: string | null
          behavior_score?: number | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          flag_reason?: string | null
          id?: string
          is_admin?: boolean
          is_flagged?: boolean | null
          long_term_review_count?: number | null
          pet_profile_completeness?: number | null
          review_count?: number | null
          trust_score?: number | null
          updated_at?: string
          username?: string
          verified_purchase_count?: number | null
        }
        Relationships: []
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
            foreignKeyName: "recommendation_trace_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        ]
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
        ]
      }
    }
    Functions: {
      analyze_version_impact: { Args: { p_product_id: string }; Returns: Json }
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
      cluster_risk_events: { Args: { p_product_id: string }; Returns: Json }
      compute_product_confidence: {
        Args: { p_product_id: string }
        Returns: number
      }
      compute_user_reputation: {
        Args: { p_profile_id: string }
        Returns: number
      }
      detect_risk_anomalies: { Args: { p_product_id: string }; Returns: Json }
      generate_daily_summary: {
        Args: { p_date: string; p_pet_id: string }
        Returns: undefined
      }
      get_health_trends: {
        Args: { p_days?: number; p_pet_id: string }
        Returns: Json
      }
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
      is_admin: { Args: { uid: string }; Returns: boolean }
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
      climate_type_t:
        | "tropical"
        | "subtropical"
        | "temperate"
        | "continental"
        | "arid"
        | "cold"
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
      life_stage_t: "kitten" | "young_adult" | "adult" | "senior" | "geriatric"
      notification_channel_t: "in_app" | "email" | "push"
      notification_type_t:
        | "followup_reminder"
        | "followup_overdue"
        | "review_published"
        | "trust_score_change"
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
  pflid: {
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
      ],
      climate_type_t: [
        "tropical",
        "subtropical",
        "temperate",
        "continental",
        "arid",
        "cold",
      ],
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
      life_stage_t: ["kitten", "young_adult", "adult", "senior", "geriatric", "super_senior"],
      notification_channel_t: ["in_app", "email", "push"],
      notification_type_t: [
        "followup_reminder",
        "followup_overdue",
        "review_published",
        "trust_score_change",
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
