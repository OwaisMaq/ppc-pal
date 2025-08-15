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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ad_groups: {
        Row: {
          acos: number | null
          acos_14d: number | null
          acos_7d: number | null
          amazon_adgroup_id: string
          campaign_id: string
          clicks: number | null
          clicks_14d: number | null
          clicks_7d: number | null
          conversion_rate_14d: number | null
          conversion_rate_7d: number | null
          cpc_14d: number | null
          cpc_7d: number | null
          created_at: string
          ctr_14d: number | null
          ctr_7d: number | null
          default_bid: number | null
          id: string
          impressions: number | null
          impressions_14d: number | null
          impressions_7d: number | null
          last_updated: string | null
          name: string
          orders: number | null
          orders_14d: number | null
          orders_7d: number | null
          roas: number | null
          roas_14d: number | null
          roas_7d: number | null
          sales: number | null
          sales_14d: number | null
          sales_7d: number | null
          spend: number | null
          spend_14d: number | null
          spend_7d: number | null
          status: Database["public"]["Enums"]["campaign_status"]
        }
        Insert: {
          acos?: number | null
          acos_14d?: number | null
          acos_7d?: number | null
          amazon_adgroup_id: string
          campaign_id: string
          clicks?: number | null
          clicks_14d?: number | null
          clicks_7d?: number | null
          conversion_rate_14d?: number | null
          conversion_rate_7d?: number | null
          cpc_14d?: number | null
          cpc_7d?: number | null
          created_at?: string
          ctr_14d?: number | null
          ctr_7d?: number | null
          default_bid?: number | null
          id?: string
          impressions?: number | null
          impressions_14d?: number | null
          impressions_7d?: number | null
          last_updated?: string | null
          name: string
          orders?: number | null
          orders_14d?: number | null
          orders_7d?: number | null
          roas?: number | null
          roas_14d?: number | null
          roas_7d?: number | null
          sales?: number | null
          sales_14d?: number | null
          sales_7d?: number | null
          spend?: number | null
          spend_14d?: number | null
          spend_7d?: number | null
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Update: {
          acos?: number | null
          acos_14d?: number | null
          acos_7d?: number | null
          amazon_adgroup_id?: string
          campaign_id?: string
          clicks?: number | null
          clicks_14d?: number | null
          clicks_7d?: number | null
          conversion_rate_14d?: number | null
          conversion_rate_7d?: number | null
          cpc_14d?: number | null
          cpc_7d?: number | null
          created_at?: string
          ctr_14d?: number | null
          ctr_7d?: number | null
          default_bid?: number | null
          id?: string
          impressions?: number | null
          impressions_14d?: number | null
          impressions_7d?: number | null
          last_updated?: string | null
          name?: string
          orders?: number | null
          orders_14d?: number | null
          orders_7d?: number | null
          roas?: number | null
          roas_14d?: number | null
          roas_7d?: number | null
          sales?: number | null
          sales_14d?: number | null
          sales_7d?: number | null
          spend?: number | null
          spend_14d?: number | null
          spend_7d?: number | null
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
      adgroup_performance_history: {
        Row: {
          acos: number | null
          adgroup_id: string | null
          attribution_window: string
          clicks: number | null
          conversion_rate: number | null
          cpc: number | null
          created_at: string
          ctr: number | null
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
          adgroup_id?: string | null
          attribution_window?: string
          clicks?: number | null
          conversion_rate?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
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
          adgroup_id?: string | null
          attribution_window?: string
          clicks?: number | null
          conversion_rate?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
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
            foreignKeyName: "adgroup_performance_history_adgroup_id_fkey"
            columns: ["adgroup_id"]
            isOneToOne: false
            referencedRelation: "ad_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      amazon_connections: {
        Row: {
          access_token: string
          advertising_api_endpoint: string | null
          campaign_count: number | null
          created_at: string
          health_issues: string[] | null
          health_status: string | null
          id: string
          last_health_check: string | null
          last_sync_at: string | null
          marketplace_id: string | null
          profile_id: string
          profile_name: string | null
          refresh_token: string
          reporting_api_version: string | null
          setup_required_reason: string | null
          status: Database["public"]["Enums"]["api_connection_status"]
          supported_attribution_models: string[] | null
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          advertising_api_endpoint?: string | null
          campaign_count?: number | null
          created_at?: string
          health_issues?: string[] | null
          health_status?: string | null
          id?: string
          last_health_check?: string | null
          last_sync_at?: string | null
          marketplace_id?: string | null
          profile_id: string
          profile_name?: string | null
          refresh_token: string
          reporting_api_version?: string | null
          setup_required_reason?: string | null
          status?: Database["public"]["Enums"]["api_connection_status"]
          supported_attribution_models?: string[] | null
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          advertising_api_endpoint?: string | null
          campaign_count?: number | null
          created_at?: string
          health_issues?: string[] | null
          health_status?: string | null
          id?: string
          last_health_check?: string | null
          last_sync_at?: string | null
          marketplace_id?: string | null
          profile_id?: string
          profile_name?: string | null
          refresh_token?: string
          reporting_api_version?: string | null
          setup_required_reason?: string | null
          status?: Database["public"]["Enums"]["api_connection_status"]
          supported_attribution_models?: string[] | null
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      amazon_report_requests: {
        Row: {
          completed_at: string | null
          configuration: Json | null
          connection_id: string
          created_at: string
          download_url: string | null
          end_date: string
          file_size: number | null
          id: string
          records_processed: number | null
          report_id: string
          report_type: string
          start_date: string
          status: string
          status_details: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          configuration?: Json | null
          connection_id: string
          created_at?: string
          download_url?: string | null
          end_date: string
          file_size?: number | null
          id?: string
          records_processed?: number | null
          report_id: string
          report_type: string
          start_date: string
          status?: string
          status_details?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          configuration?: Json | null
          connection_id?: string
          created_at?: string
          download_url?: string | null
          end_date?: string
          file_size?: number | null
          id?: string
          records_processed?: number | null
          report_id?: string
          report_type?: string
          start_date?: string
          status?: string
          status_details?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ams_messages_sp_conversion: {
        Row: {
          ad_group_id: string | null
          attributed_conversions: number
          attributed_sales: number
          campaign_id: string | null
          connection_id: string
          created_at: string
          hour_start: string
          id: string
          keyword_id: string | null
          payload: Json
          profile_id: string
          received_at: string
          target_id: string | null
        }
        Insert: {
          ad_group_id?: string | null
          attributed_conversions?: number
          attributed_sales?: number
          campaign_id?: string | null
          connection_id: string
          created_at?: string
          hour_start: string
          id?: string
          keyword_id?: string | null
          payload?: Json
          profile_id: string
          received_at?: string
          target_id?: string | null
        }
        Update: {
          ad_group_id?: string | null
          attributed_conversions?: number
          attributed_sales?: number
          campaign_id?: string | null
          connection_id?: string
          created_at?: string
          hour_start?: string
          id?: string
          keyword_id?: string | null
          payload?: Json
          profile_id?: string
          received_at?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ams_msg_conv_conn"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ams_msg_conv_conn"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections_client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ams_msg_conv_conn"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      ams_messages_sp_traffic: {
        Row: {
          ad_group_id: string | null
          campaign_id: string | null
          clicks: number
          connection_id: string
          cost: number
          created_at: string
          hour_start: string
          id: string
          impressions: number
          keyword_id: string | null
          payload: Json
          profile_id: string
          received_at: string
          target_id: string | null
        }
        Insert: {
          ad_group_id?: string | null
          campaign_id?: string | null
          clicks?: number
          connection_id: string
          cost?: number
          created_at?: string
          hour_start: string
          id?: string
          impressions?: number
          keyword_id?: string | null
          payload?: Json
          profile_id: string
          received_at?: string
          target_id?: string | null
        }
        Update: {
          ad_group_id?: string | null
          campaign_id?: string | null
          clicks?: number
          connection_id?: string
          cost?: number
          created_at?: string
          hour_start?: string
          id?: string
          impressions?: number
          keyword_id?: string | null
          payload?: Json
          profile_id?: string
          received_at?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ams_msg_traf_conn"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ams_msg_traf_conn"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections_client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ams_msg_traf_conn"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      ams_subscriptions: {
        Row: {
          connection_id: string
          created_at: string
          dataset_id: string
          destination_arn: string | null
          destination_type: string | null
          error: string | null
          id: string
          last_delivery_at: string | null
          region: string | null
          status: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          dataset_id: string
          destination_arn?: string | null
          destination_type?: string | null
          error?: string | null
          id?: string
          last_delivery_at?: string | null
          region?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          dataset_id?: string
          destination_arn?: string | null
          destination_type?: string | null
          error?: string | null
          id?: string
          last_delivery_at?: string | null
          region?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ams_sub_conn"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ams_sub_conn"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections_client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ams_sub_conn"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      api_analysis_results: {
        Row: {
          analysis_type: string
          confidence_score: number | null
          created_at: string
          documentation_source_id: string
          id: string
          recommendations: Json | null
          results: Json
          updated_at: string
        }
        Insert: {
          analysis_type: string
          confidence_score?: number | null
          created_at?: string
          documentation_source_id: string
          id?: string
          recommendations?: Json | null
          results?: Json
          updated_at?: string
        }
        Update: {
          analysis_type?: string
          confidence_score?: number | null
          created_at?: string
          documentation_source_id?: string
          id?: string
          recommendations?: Json | null
          results?: Json
          updated_at?: string
        }
        Relationships: []
      }
      api_best_practices: {
        Row: {
          api_version: string | null
          category: string
          created_at: string
          description: string
          id: string
          rule_pattern: string | null
          severity: string
          title: string
          updated_at: string
        }
        Insert: {
          api_version?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          rule_pattern?: string | null
          severity?: string
          title: string
          updated_at?: string
        }
        Update: {
          api_version?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          rule_pattern?: string | null
          severity?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_budget_usage: {
        Row: {
          budget_amount: number | null
          campaign_id: string | null
          created_at: string
          currency: string | null
          date: string
          id: string
          period_type: string
          usage_amount: number | null
          usage_percentage: number | null
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          budget_amount?: number | null
          campaign_id?: string | null
          created_at?: string
          currency?: string | null
          date: string
          id?: string
          period_type?: string
          usage_amount?: number | null
          usage_percentage?: number | null
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          budget_amount?: number | null
          campaign_id?: string | null
          created_at?: string
          currency?: string | null
          date?: string
          id?: string
          period_type?: string
          usage_amount?: number | null
          usage_percentage?: number | null
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_budget_usage_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_performance_history: {
        Row: {
          acos: number | null
          attribution_window: string
          campaign_id: string | null
          clicks: number | null
          conversion_rate: number | null
          cpc: number | null
          created_at: string
          ctr: number | null
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
          attribution_window?: string
          campaign_id?: string | null
          clicks?: number | null
          conversion_rate?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
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
          attribution_window?: string
          campaign_id?: string | null
          clicks?: number | null
          conversion_rate?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
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
            foreignKeyName: "campaign_performance_history_campaign_id_fkey"
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
          acos_14d: number | null
          acos_7d: number | null
          amazon_campaign_id: string
          asin: string | null
          attributed_conversions_14d: number | null
          attributed_conversions_1d: number | null
          attributed_conversions_30d: number | null
          attributed_conversions_7d: number | null
          attributed_conversions_legacy: number | null
          attributed_sales_14d: number | null
          attributed_sales_1d: number | null
          attributed_sales_30d: number | null
          attributed_sales_7d: number | null
          attributed_sales_legacy: number | null
          attribution_model: string | null
          budget: number | null
          campaign_type: string | null
          clicks: number | null
          clicks_14d: number | null
          clicks_7d: number | null
          connection_id: string
          conversion_rate_14d: number | null
          conversion_rate_7d: number | null
          cost_14d: number | null
          cost_1d: number | null
          cost_30d: number | null
          cost_7d: number | null
          cost_legacy: number | null
          cpc_14d: number | null
          cpc_7d: number | null
          created_at: string
          ctr_14d: number | null
          ctr_7d: number | null
          daily_budget: number | null
          data_source: string | null
          end_date: string | null
          id: string
          impressions: number | null
          impressions_14d: number | null
          impressions_7d: number | null
          last_updated: string | null
          name: string
          product_type: string | null
          roas: number | null
          roas_14d: number | null
          roas_7d: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          targeting_type: string | null
        }
        Insert: {
          acos?: number | null
          acos_14d?: number | null
          acos_7d?: number | null
          amazon_campaign_id: string
          asin?: string | null
          attributed_conversions_14d?: number | null
          attributed_conversions_1d?: number | null
          attributed_conversions_30d?: number | null
          attributed_conversions_7d?: number | null
          attributed_conversions_legacy?: number | null
          attributed_sales_14d?: number | null
          attributed_sales_1d?: number | null
          attributed_sales_30d?: number | null
          attributed_sales_7d?: number | null
          attributed_sales_legacy?: number | null
          attribution_model?: string | null
          budget?: number | null
          campaign_type?: string | null
          clicks?: number | null
          clicks_14d?: number | null
          clicks_7d?: number | null
          connection_id: string
          conversion_rate_14d?: number | null
          conversion_rate_7d?: number | null
          cost_14d?: number | null
          cost_1d?: number | null
          cost_30d?: number | null
          cost_7d?: number | null
          cost_legacy?: number | null
          cpc_14d?: number | null
          cpc_7d?: number | null
          created_at?: string
          ctr_14d?: number | null
          ctr_7d?: number | null
          daily_budget?: number | null
          data_source?: string | null
          end_date?: string | null
          id?: string
          impressions?: number | null
          impressions_14d?: number | null
          impressions_7d?: number | null
          last_updated?: string | null
          name: string
          product_type?: string | null
          roas?: number | null
          roas_14d?: number | null
          roas_7d?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          targeting_type?: string | null
        }
        Update: {
          acos?: number | null
          acos_14d?: number | null
          acos_7d?: number | null
          amazon_campaign_id?: string
          asin?: string | null
          attributed_conversions_14d?: number | null
          attributed_conversions_1d?: number | null
          attributed_conversions_30d?: number | null
          attributed_conversions_7d?: number | null
          attributed_conversions_legacy?: number | null
          attributed_sales_14d?: number | null
          attributed_sales_1d?: number | null
          attributed_sales_30d?: number | null
          attributed_sales_7d?: number | null
          attributed_sales_legacy?: number | null
          attribution_model?: string | null
          budget?: number | null
          campaign_type?: string | null
          clicks?: number | null
          clicks_14d?: number | null
          clicks_7d?: number | null
          connection_id?: string
          conversion_rate_14d?: number | null
          conversion_rate_7d?: number | null
          cost_14d?: number | null
          cost_1d?: number | null
          cost_30d?: number | null
          cost_7d?: number | null
          cost_legacy?: number | null
          cpc_14d?: number | null
          cpc_7d?: number | null
          created_at?: string
          ctr_14d?: number | null
          ctr_7d?: number | null
          daily_budget?: number | null
          data_source?: string | null
          end_date?: string | null
          id?: string
          impressions?: number | null
          impressions_14d?: number | null
          impressions_7d?: number | null
          last_updated?: string | null
          name?: string
          product_type?: string | null
          roas?: number | null
          roas_14d?: number | null
          roas_7d?: number | null
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
          {
            foreignKeyName: "campaigns_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections_client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      code_validation_results: {
        Row: {
          api_spec_reference: string | null
          compliance_score: number | null
          created_at: string
          file_path: string
          id: string
          issues: Json | null
          recommendations: Json | null
          updated_at: string
          user_id: string
          validation_type: string
        }
        Insert: {
          api_spec_reference?: string | null
          compliance_score?: number | null
          created_at?: string
          file_path: string
          id?: string
          issues?: Json | null
          recommendations?: Json | null
          updated_at?: string
          user_id: string
          validation_type: string
        }
        Update: {
          api_spec_reference?: string | null
          compliance_score?: number | null
          created_at?: string
          file_path?: string
          id?: string
          issues?: Json | null
          recommendations?: Json | null
          updated_at?: string
          user_id?: string
          validation_type?: string
        }
        Relationships: []
      }
      documentation_sources: {
        Row: {
          analysis_results: Json | null
          api_spec_data: Json | null
          content: string
          content_type: string
          created_at: string
          github_branch: string | null
          github_repo: string | null
          id: string
          is_active: boolean
          last_analysis_at: string | null
          last_scraped_at: string
          metadata: Json | null
          parsing_config: Json | null
          source_type_enum:
            | Database["public"]["Enums"]["documentation_source_type"]
            | null
          title: string
          updated_at: string
          url: string
          version_hash: string
        }
        Insert: {
          analysis_results?: Json | null
          api_spec_data?: Json | null
          content: string
          content_type?: string
          created_at?: string
          github_branch?: string | null
          github_repo?: string | null
          id?: string
          is_active?: boolean
          last_analysis_at?: string | null
          last_scraped_at?: string
          metadata?: Json | null
          parsing_config?: Json | null
          source_type_enum?:
            | Database["public"]["Enums"]["documentation_source_type"]
            | null
          title: string
          updated_at?: string
          url: string
          version_hash: string
        }
        Update: {
          analysis_results?: Json | null
          api_spec_data?: Json | null
          content?: string
          content_type?: string
          created_at?: string
          github_branch?: string | null
          github_repo?: string | null
          id?: string
          is_active?: boolean
          last_analysis_at?: string | null
          last_scraped_at?: string
          metadata?: Json | null
          parsing_config?: Json | null
          source_type_enum?:
            | Database["public"]["Enums"]["documentation_source_type"]
            | null
          title?: string
          updated_at?: string
          url?: string
          version_hash?: string
        }
        Relationships: []
      }
      documentation_sync_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_details: Json | null
          id: string
          sources_failed: number | null
          sources_processed: number | null
          sources_updated: number | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          id?: string
          sources_failed?: number | null
          sources_processed?: number | null
          sources_updated?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          id?: string
          sources_failed?: number | null
          sources_processed?: number | null
          sources_updated?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
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
      keyword_performance_history: {
        Row: {
          acos: number | null
          attribution_window: string
          clicks: number | null
          conversion_rate: number | null
          cpc: number | null
          created_at: string
          ctr: number | null
          date: string
          id: string
          impressions: number | null
          keyword_id: string | null
          orders: number | null
          roas: number | null
          sales: number | null
          spend: number | null
        }
        Insert: {
          acos?: number | null
          attribution_window?: string
          clicks?: number | null
          conversion_rate?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          date: string
          id?: string
          impressions?: number | null
          keyword_id?: string | null
          orders?: number | null
          roas?: number | null
          sales?: number | null
          spend?: number | null
        }
        Update: {
          acos?: number | null
          attribution_window?: string
          clicks?: number | null
          conversion_rate?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          date?: string
          id?: string
          impressions?: number | null
          keyword_id?: string | null
          orders?: number | null
          roas?: number | null
          sales?: number | null
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "keyword_performance_history_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      keywords: {
        Row: {
          acos: number | null
          acos_14d: number | null
          acos_7d: number | null
          adgroup_id: string
          amazon_keyword_id: string
          asin: string | null
          bid: number | null
          clicks: number | null
          clicks_14d: number | null
          clicks_7d: number | null
          conversion_rate: number | null
          conversion_rate_14d: number | null
          conversion_rate_7d: number | null
          cpc: number | null
          cpc_14d: number | null
          cpc_7d: number | null
          created_at: string
          ctr: number | null
          ctr_14d: number | null
          ctr_7d: number | null
          id: string
          impressions: number | null
          impressions_14d: number | null
          impressions_7d: number | null
          keyword_text: string
          last_updated: string | null
          match_type: string
          orders: number | null
          orders_14d: number | null
          orders_7d: number | null
          roas: number | null
          roas_14d: number | null
          roas_7d: number | null
          sales: number | null
          sales_14d: number | null
          sales_7d: number | null
          spend: number | null
          spend_14d: number | null
          spend_7d: number | null
          status: Database["public"]["Enums"]["campaign_status"]
        }
        Insert: {
          acos?: number | null
          acos_14d?: number | null
          acos_7d?: number | null
          adgroup_id: string
          amazon_keyword_id: string
          asin?: string | null
          bid?: number | null
          clicks?: number | null
          clicks_14d?: number | null
          clicks_7d?: number | null
          conversion_rate?: number | null
          conversion_rate_14d?: number | null
          conversion_rate_7d?: number | null
          cpc?: number | null
          cpc_14d?: number | null
          cpc_7d?: number | null
          created_at?: string
          ctr?: number | null
          ctr_14d?: number | null
          ctr_7d?: number | null
          id?: string
          impressions?: number | null
          impressions_14d?: number | null
          impressions_7d?: number | null
          keyword_text: string
          last_updated?: string | null
          match_type: string
          orders?: number | null
          orders_14d?: number | null
          orders_7d?: number | null
          roas?: number | null
          roas_14d?: number | null
          roas_7d?: number | null
          sales?: number | null
          sales_14d?: number | null
          sales_7d?: number | null
          spend?: number | null
          spend_14d?: number | null
          spend_7d?: number | null
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Update: {
          acos?: number | null
          acos_14d?: number | null
          acos_7d?: number | null
          adgroup_id?: string
          amazon_keyword_id?: string
          asin?: string | null
          bid?: number | null
          clicks?: number | null
          clicks_14d?: number | null
          clicks_7d?: number | null
          conversion_rate?: number | null
          conversion_rate_14d?: number | null
          conversion_rate_7d?: number | null
          cpc?: number | null
          cpc_14d?: number | null
          cpc_7d?: number | null
          created_at?: string
          ctr?: number | null
          ctr_14d?: number | null
          ctr_7d?: number | null
          id?: string
          impressions?: number | null
          impressions_14d?: number | null
          impressions_7d?: number | null
          keyword_text?: string
          last_updated?: string | null
          match_type?: string
          orders?: number | null
          orders_14d?: number | null
          orders_7d?: number | null
          roas?: number | null
          roas_14d?: number | null
          roas_7d?: number | null
          sales?: number | null
          sales_14d?: number | null
          sales_7d?: number | null
          spend?: number | null
          spend_14d?: number | null
          spend_7d?: number | null
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
          {
            foreignKeyName: "optimization_results_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections_client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optimization_results_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections_safe"
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
      security_incidents: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          category: string
          created_at: string
          description: string
          details: Json
          id: string
          severity: string
          source: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          category: string
          created_at?: string
          description: string
          details?: Json
          id?: string
          severity?: string
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          category?: string
          created_at?: string
          description?: string
          details?: Json
          id?: string
          severity?: string
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
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
      sync_performance_logs: {
        Row: {
          campaigns_processed: number | null
          connection_id: string
          created_at: string
          end_time: string | null
          error_message: string | null
          id: string
          operation_type: string
          performance_metrics: Json | null
          phases: Json | null
          start_time: string
          success: boolean | null
          total_duration_ms: number | null
        }
        Insert: {
          campaigns_processed?: number | null
          connection_id: string
          created_at?: string
          end_time?: string | null
          error_message?: string | null
          id?: string
          operation_type?: string
          performance_metrics?: Json | null
          phases?: Json | null
          start_time: string
          success?: boolean | null
          total_duration_ms?: number | null
        }
        Update: {
          campaigns_processed?: number | null
          connection_id?: string
          created_at?: string
          end_time?: string | null
          error_message?: string | null
          id?: string
          operation_type?: string
          performance_metrics?: Json | null
          phases?: Json | null
          start_time?: string
          success?: boolean | null
          total_duration_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_performance_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_performance_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections_client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_performance_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "amazon_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      targets: {
        Row: {
          acos: number | null
          acos_14d: number | null
          acos_7d: number | null
          adgroup_id: string
          amazon_target_id: string
          asin: string | null
          bid: number | null
          clicks: number | null
          clicks_14d: number | null
          clicks_7d: number | null
          conversion_rate: number | null
          conversion_rate_14d: number | null
          conversion_rate_7d: number | null
          cpc: number | null
          cpc_14d: number | null
          cpc_7d: number | null
          created_at: string
          ctr: number | null
          ctr_14d: number | null
          ctr_7d: number | null
          expression: Json | null
          id: string
          impressions: number | null
          impressions_14d: number | null
          impressions_7d: number | null
          last_updated: string | null
          orders: number | null
          orders_14d: number | null
          orders_7d: number | null
          roas: number | null
          roas_14d: number | null
          roas_7d: number | null
          sales: number | null
          sales_14d: number | null
          sales_7d: number | null
          spend: number | null
          spend_14d: number | null
          spend_7d: number | null
          status: Database["public"]["Enums"]["campaign_status"]
          type: string | null
        }
        Insert: {
          acos?: number | null
          acos_14d?: number | null
          acos_7d?: number | null
          adgroup_id: string
          amazon_target_id: string
          asin?: string | null
          bid?: number | null
          clicks?: number | null
          clicks_14d?: number | null
          clicks_7d?: number | null
          conversion_rate?: number | null
          conversion_rate_14d?: number | null
          conversion_rate_7d?: number | null
          cpc?: number | null
          cpc_14d?: number | null
          cpc_7d?: number | null
          created_at?: string
          ctr?: number | null
          ctr_14d?: number | null
          ctr_7d?: number | null
          expression?: Json | null
          id?: string
          impressions?: number | null
          impressions_14d?: number | null
          impressions_7d?: number | null
          last_updated?: string | null
          orders?: number | null
          orders_14d?: number | null
          orders_7d?: number | null
          roas?: number | null
          roas_14d?: number | null
          roas_7d?: number | null
          sales?: number | null
          sales_14d?: number | null
          sales_7d?: number | null
          spend?: number | null
          spend_14d?: number | null
          spend_7d?: number | null
          status?: Database["public"]["Enums"]["campaign_status"]
          type?: string | null
        }
        Update: {
          acos?: number | null
          acos_14d?: number | null
          acos_7d?: number | null
          adgroup_id?: string
          amazon_target_id?: string
          asin?: string | null
          bid?: number | null
          clicks?: number | null
          clicks_14d?: number | null
          clicks_7d?: number | null
          conversion_rate?: number | null
          conversion_rate_14d?: number | null
          conversion_rate_7d?: number | null
          cpc?: number | null
          cpc_14d?: number | null
          cpc_7d?: number | null
          created_at?: string
          ctr?: number | null
          ctr_14d?: number | null
          ctr_7d?: number | null
          expression?: Json | null
          id?: string
          impressions?: number | null
          impressions_14d?: number | null
          impressions_7d?: number | null
          last_updated?: string | null
          orders?: number | null
          orders_14d?: number | null
          orders_7d?: number | null
          roas?: number | null
          roas_14d?: number | null
          roas_7d?: number | null
          sales?: number | null
          sales_14d?: number | null
          sales_7d?: number | null
          spend?: number | null
          spend_14d?: number | null
          spend_7d?: number | null
          status?: Database["public"]["Enums"]["campaign_status"]
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "targets_adgroup_id_fkey"
            columns: ["adgroup_id"]
            isOneToOne: false
            referencedRelation: "ad_groups"
            referencedColumns: ["id"]
          },
        ]
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
      amazon_connections_client: {
        Row: {
          advertising_api_endpoint: string | null
          campaign_count: number | null
          created_at: string | null
          health_issues: string[] | null
          health_status: string | null
          id: string | null
          last_health_check: string | null
          last_sync_at: string | null
          marketplace_id: string | null
          profile_id: string | null
          profile_name: string | null
          reporting_api_version: string | null
          setup_required_reason: string | null
          status: Database["public"]["Enums"]["api_connection_status"] | null
          supported_attribution_models: string[] | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          advertising_api_endpoint?: string | null
          campaign_count?: number | null
          created_at?: string | null
          health_issues?: string[] | null
          health_status?: string | null
          id?: string | null
          last_health_check?: string | null
          last_sync_at?: string | null
          marketplace_id?: string | null
          profile_id?: string | null
          profile_name?: string | null
          reporting_api_version?: string | null
          setup_required_reason?: string | null
          status?: Database["public"]["Enums"]["api_connection_status"] | null
          supported_attribution_models?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          advertising_api_endpoint?: string | null
          campaign_count?: number | null
          created_at?: string | null
          health_issues?: string[] | null
          health_status?: string | null
          id?: string | null
          last_health_check?: string | null
          last_sync_at?: string | null
          marketplace_id?: string | null
          profile_id?: string | null
          profile_name?: string | null
          reporting_api_version?: string | null
          setup_required_reason?: string | null
          status?: Database["public"]["Enums"]["api_connection_status"] | null
          supported_attribution_models?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      amazon_connections_safe: {
        Row: {
          advertising_api_endpoint: string | null
          campaign_count: number | null
          created_at: string | null
          health_issues: string[] | null
          health_status: string | null
          id: string | null
          last_health_check: string | null
          last_sync_at: string | null
          marketplace_id: string | null
          profile_id: string | null
          profile_name: string | null
          reporting_api_version: string | null
          setup_required_reason: string | null
          status: Database["public"]["Enums"]["api_connection_status"] | null
          supported_attribution_models: string[] | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          advertising_api_endpoint?: string | null
          campaign_count?: number | null
          created_at?: string | null
          health_issues?: string[] | null
          health_status?: string | null
          id?: string | null
          last_health_check?: string | null
          last_sync_at?: string | null
          marketplace_id?: string | null
          profile_id?: string | null
          profile_name?: string | null
          reporting_api_version?: string | null
          setup_required_reason?: string | null
          status?: Database["public"]["Enums"]["api_connection_status"] | null
          supported_attribution_models?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          advertising_api_endpoint?: string | null
          campaign_count?: number | null
          created_at?: string | null
          health_issues?: string[] | null
          health_status?: string | null
          id?: string | null
          last_health_check?: string | null
          last_sync_at?: string | null
          marketplace_id?: string | null
          profile_id?: string | null
          profile_name?: string | null
          reporting_api_version?: string | null
          setup_required_reason?: string | null
          status?: Database["public"]["Enums"]["api_connection_status"] | null
          supported_attribution_models?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
        Args: { connection_uuid: string; user_uuid: string }
        Returns: string
      }
      get_ams_data_freshness: {
        Args: { connection_uuid: string }
        Returns: {
          data_age_hours: number
          last_conversion_message: string
          last_traffic_message: string
          messages_24h: number
        }[]
      }
      grant_admin_role_by_email: {
        Args: { user_email: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          role_name: Database["public"]["Enums"]["app_role"]
          user_uuid: string
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
      sync_amazon_data_v3: {
        Args: { connection_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      api_connection_status:
        | "active"
        | "expired"
        | "error"
        | "pending"
        | "warning"
        | "setup_required"
      app_role: "admin" | "user"
      campaign_status: "enabled" | "paused" | "archived"
      documentation_source_type:
        | "manual"
        | "openapi"
        | "github"
        | "rss"
        | "crawler"
      optimization_status: "pending" | "in_progress" | "completed" | "failed"
      subscription_plan: "free" | "pro"
      subscription_status: "active" | "cancelled" | "past_due" | "incomplete"
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
    Enums: {
      api_connection_status: [
        "active",
        "expired",
        "error",
        "pending",
        "warning",
        "setup_required",
      ],
      app_role: ["admin", "user"],
      campaign_status: ["enabled", "paused", "archived"],
      documentation_source_type: [
        "manual",
        "openapi",
        "github",
        "rss",
        "crawler",
      ],
      optimization_status: ["pending", "in_progress", "completed", "failed"],
      subscription_plan: ["free", "pro"],
      subscription_status: ["active", "cancelled", "past_due", "incomplete"],
    },
  },
} as const
