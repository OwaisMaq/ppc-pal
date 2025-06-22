export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ad_groups: {
        Row: {
          acos: number | null
          amazon_adgroup_id: string
          campaign_id: string
          clicks: number | null
          created_at: string
          default_bid: number | null
          id: string
          impressions: number | null
          last_updated: string | null
          name: string
          orders: number | null
          roas: number | null
          sales: number | null
          spend: number | null
          status: Database["public"]["Enums"]["campaign_status"]
        }
        Insert: {
          acos?: number | null
          amazon_adgroup_id: string
          campaign_id: string
          clicks?: number | null
          created_at?: string
          default_bid?: number | null
          id?: string
          impressions?: number | null
          last_updated?: string | null
          name: string
          orders?: number | null
          roas?: number | null
          sales?: number | null
          spend?: number | null
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Update: {
          acos?: number | null
          amazon_adgroup_id?: string
          campaign_id?: string
          clicks?: number | null
          created_at?: string
          default_bid?: number | null
          id?: string
          impressions?: number | null
          last_updated?: string | null
          name?: string
          orders?: number | null
          roas?: number | null
          sales?: number | null
          spend?: number | null
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ad_groups_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      amazon_connections: {
        Row: {
          access_token: string
          created_at: string
          id: string
          last_sync_at: string | null
          marketplace_id: string | null
          profile_id: string
          profile_name: string | null
          refresh_token: string
          status: Database["public"]["Enums"]["api_connection_status"]
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          marketplace_id?: string | null
          profile_id: string
          profile_name?: string | null
          refresh_token: string
          status?: Database["public"]["Enums"]["api_connection_status"]
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          marketplace_id?: string | null
          profile_id?: string
          profile_name?: string | null
          refresh_token?: string
          status?: Database["public"]["Enums"]["api_connection_status"]
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      automation_preferences: {
        Row: {
          acos_pause_threshold: number
          auto_bidding_enabled: boolean
          auto_keywords_enabled: boolean
          auto_optimization_enabled: boolean
          auto_pausing_enabled: boolean
          budget_optimization_enabled: boolean
          connection_id: string
          created_at: string
          id: string
          last_optimization_run: string | null
          max_bid_adjustment_percent: number
          max_budget_increase_percent: number
          optimization_frequency_hours: number
          performance_review_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          acos_pause_threshold?: number
          auto_bidding_enabled?: boolean
          auto_keywords_enabled?: boolean
          auto_optimization_enabled?: boolean
          auto_pausing_enabled?: boolean
          budget_optimization_enabled?: boolean
          connection_id: string
          created_at?: string
          id?: string
          last_optimization_run?: string | null
          max_bid_adjustment_percent?: number
          max_budget_increase_percent?: number
          optimization_frequency_hours?: number
          performance_review_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          acos_pause_threshold?: number
          auto_bidding_enabled?: boolean
          auto_keywords_enabled?: boolean
          auto_optimization_enabled?: boolean
          auto_pausing_enabled?: boolean
          budget_optimization_enabled?: boolean
          connection_id?: string
          created_at?: string
          id?: string
          last_optimization_run?: string | null
          max_bid_adjustment_percent?: number
          max_budget_increase_percent?: number
          optimization_frequency_hours?: number
          performance_review_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_preferences_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_metrics_history: {
        Row: {
          acos: number | null
          campaign_id: string
          clicks: number | null
          created_at: string
          data_source: string | null
          date: string
          id: string
          impressions: number | null
          orders: number | null
          roas: number | null
          sales: number | null
          spend: number | null
        }
        Insert: {
          acos?: number | null
          campaign_id: string
          clicks?: number | null
          created_at?: string
          data_source?: string | null
          date: string
          id?: string
          impressions?: number | null
          orders?: number | null
          roas?: number | null
          sales?: number | null
          spend?: number | null
        }
        Update: {
          acos?: number | null
          campaign_id?: string
          clicks?: number | null
          created_at?: string
          data_source?: string | null
          date?: string
          id?: string
          impressions?: number | null
          orders?: number | null
          roas?: number | null
          sales?: number | null
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          acos: number | null
          amazon_campaign_id: string
          budget: number | null
          campaign_type: string | null
          clicks: number | null
          connection_id: string
          created_at: string
          daily_budget: number | null
          data_source: string | null
          end_date: string | null
          id: string
          impressions: number | null
          last_updated: string | null
          metrics_last_calculated: string | null
          name: string
          orders: number | null
          previous_month_orders: number | null
          previous_month_sales: number | null
          previous_month_spend: number | null
          previous_orders: number | null
          previous_sales: number | null
          previous_spend: number | null
          roas: number | null
          sales: number | null
          spend: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          targeting_type: string | null
        }
        Insert: {
          acos?: number | null
          amazon_campaign_id: string
          budget?: number | null
          campaign_type?: string | null
          clicks?: number | null
          connection_id: string
          created_at?: string
          daily_budget?: number | null
          data_source?: string | null
          end_date?: string | null
          id?: string
          impressions?: number | null
          last_updated?: string | null
          metrics_last_calculated?: string | null
          name: string
          orders?: number | null
          previous_month_orders?: number | null
          previous_month_sales?: number | null
          previous_month_spend?: number | null
          previous_orders?: number | null
          previous_sales?: number | null
          previous_spend?: number | null
          roas?: number | null
          sales?: number | null
          spend?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          targeting_type?: string | null
        }
        Update: {
          acos?: number | null
          amazon_campaign_id?: string
          budget?: number | null
          campaign_type?: string | null
          clicks?: number | null
          connection_id?: string
          created_at?: string
          daily_budget?: number | null
          data_source?: string | null
          end_date?: string | null
          id?: string
          impressions?: number | null
          last_updated?: string | null
          metrics_last_calculated?: string | null
          name?: string
          orders?: number | null
          previous_month_orders?: number | null
          previous_month_sales?: number | null
          previous_month_spend?: number | null
          previous_orders?: number | null
          previous_sales?: number | null
          previous_spend?: number | null
          roas?: number | null
          sales?: number | null
          spend?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          targeting_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          feedback_type: string
          id: string
          message: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_type?: string
          id?: string
          message: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      keywords: {
        Row: {
          acos: number | null
          adgroup_id: string
          amazon_keyword_id: string
          bid: number | null
          clicks: number | null
          conversion_rate: number | null
          cpc: number | null
          created_at: string
          ctr: number | null
          id: string
          impressions: number | null
          keyword_text: string
          last_updated: string | null
          match_type: string
          orders: number | null
          roas: number | null
          sales: number | null
          spend: number | null
          status: Database["public"]["Enums"]["campaign_status"]
        }
        Insert: {
          acos?: number | null
          adgroup_id: string
          amazon_keyword_id: string
          bid?: number | null
          clicks?: number | null
          conversion_rate?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number | null
          keyword_text: string
          last_updated?: string | null
          match_type: string
          orders?: number | null
          roas?: number | null
          sales?: number | null
          spend?: number | null
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Update: {
          acos?: number | null
          adgroup_id?: string
          amazon_keyword_id?: string
          bid?: number | null
          clicks?: number | null
          conversion_rate?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number | null
          keyword_text?: string
          last_updated?: string | null
          match_type?: string
          orders?: number | null
          roas?: number | null
          sales?: number | null
          spend?: number | null
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Relationships: [
          {
            foreignKeyName: "keywords_adgroup_id_fkey"
            columns: ["adgroup_id"]
            isOneToOne: false
            referencedRelation: "ad_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      optimization_recommendations: {
        Row: {
          applied: boolean | null
          applied_at: string | null
          created_at: string
          current_value: string | null
          entity_id: string
          entity_type: string
          estimated_impact: number | null
          id: string
          impact_level: string
          optimization_result_id: string
          reasoning: string
          recommendation_type: string
          recommended_value: string | null
        }
        Insert: {
          applied?: boolean | null
          applied_at?: string | null
          created_at?: string
          current_value?: string | null
          entity_id: string
          entity_type: string
          estimated_impact?: number | null
          id?: string
          impact_level: string
          optimization_result_id: string
          reasoning: string
          recommendation_type: string
          recommended_value?: string | null
        }
        Update: {
          applied?: boolean | null
          applied_at?: string | null
          created_at?: string
          current_value?: string | null
          entity_id?: string
          entity_type?: string
          estimated_impact?: number | null
          id?: string
          impact_level?: string
          optimization_result_id?: string
          reasoning?: string
          recommendation_type?: string
          recommended_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optimization_recommendations_optimization_result_id_fkey"
            columns: ["optimization_result_id"]
            isOneToOne: false
            referencedRelation: "optimization_results"
            referencedColumns: ["id"]
          },
        ]
      }
      optimization_results: {
        Row: {
          completed_at: string | null
          connection_id: string
          created_at: string
          error_message: string | null
          estimated_impact_sales: number | null
          estimated_impact_spend: number | null
          id: string
          optimization_type: string
          results_data: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["optimization_status"]
          total_keywords_analyzed: number | null
          total_recommendations: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          created_at?: string
          error_message?: string | null
          estimated_impact_sales?: number | null
          estimated_impact_spend?: number | null
          id?: string
          optimization_type: string
          results_data?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["optimization_status"]
          total_keywords_analyzed?: number | null
          total_recommendations?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          created_at?: string
          error_message?: string | null
          estimated_impact_sales?: number | null
          estimated_impact_spend?: number | null
          id?: string
          optimization_type?: string
          results_data?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["optimization_status"]
          total_keywords_analyzed?: number | null
          total_recommendations?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "optimization_results_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_limits: {
        Row: {
          created_at: string
          id: string
          optimization_limit: number
          plan_type: Database["public"]["Enums"]["subscription_plan"]
        }
        Insert: {
          created_at?: string
          id?: string
          optimization_limit: number
          plan_type: Database["public"]["Enums"]["subscription_plan"]
        }
        Update: {
          created_at?: string
          id?: string
          optimization_limit?: number
          plan_type?: Database["public"]["Enums"]["subscription_plan"]
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          created_at: string
          id: string
          optimizations_used: number
          period_end: string
          period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          optimizations_used?: number
          period_end?: string
          period_start?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          optimizations_used?: number
          period_end?: string
          period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_campaign_changes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      can_user_optimize: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      create_optimization_batch: {
        Args: { user_uuid: string; connection_uuid: string }
        Returns: string
      }
      grant_admin_role_by_email: {
        Args: { user_email: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          user_uuid: string
          role_name: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      increment_optimization_usage: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      sync_amazon_data: {
        Args: { connection_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      api_connection_status: "active" | "expired" | "error" | "pending"
      app_role: "admin" | "user"
      campaign_status: "enabled" | "paused" | "archived"
      optimization_status: "pending" | "in_progress" | "completed" | "failed"
      subscription_plan: "free" | "pro"
      subscription_status: "active" | "cancelled" | "past_due" | "incomplete"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      api_connection_status: ["active", "expired", "error", "pending"],
      app_role: ["admin", "user"],
      campaign_status: ["enabled", "paused", "archived"],
      optimization_status: ["pending", "in_progress", "completed", "failed"],
      subscription_plan: ["free", "pro"],
      subscription_status: ["active", "cancelled", "past_due", "incomplete"],
    },
  },
} as const
