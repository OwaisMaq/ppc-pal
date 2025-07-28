export interface AmazonConnection {
  id: string;
  user_id: string;
  profile_id: string;
  profile_name?: string;
  marketplace_id?: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  status: 'active' | 'expired' | 'error' | 'pending' | 'warning' | 'setup_required';
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
  setup_required_reason?: string;
  reporting_api_version?: string;
  supported_attribution_models?: string[];
}

export interface Campaign {
  id: string;
  connection_id: string;
  amazon_campaign_id: string;
  name: string;
  campaign_type?: string;
  targeting_type?: string;
  status: 'enabled' | 'paused' | 'archived';
  budget?: number;
  daily_budget?: number;
  start_date?: string;
  end_date?: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos?: number;
  roas?: number;
  // Attribution window specific metrics
  acos_7d?: number;
  acos_14d?: number;
  roas_7d?: number;
  roas_14d?: number;
  sales_7d?: number;
  sales_14d?: number;
  orders_7d?: number;
  orders_14d?: number;
  attribution_model?: string;
  last_updated?: string;
  created_at: string;
}

export interface AdGroup {
  id: string;
  campaign_id: string;
  amazon_adgroup_id: string;
  name: string;
  status: 'enabled' | 'paused' | 'archived';
  default_bid?: number;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos?: number;
  roas?: number;
  // Attribution window specific metrics
  acos_7d?: number;
  acos_14d?: number;
  roas_7d?: number;
  roas_14d?: number;
  sales_7d?: number;
  sales_14d?: number;
  orders_7d?: number;
  orders_14d?: number;
  last_updated?: string;
  created_at: string;
}

export interface Keyword {
  id: string;
  adgroup_id: string;
  amazon_keyword_id: string;
  keyword_text: string;
  match_type: string;
  bid?: number;
  status: 'enabled' | 'paused' | 'archived';
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos?: number;
  roas?: number;
  // Attribution window specific metrics
  acos_7d?: number;
  acos_14d?: number;
  roas_7d?: number;
  roas_14d?: number;
  sales_7d?: number;
  sales_14d?: number;
  orders_7d?: number;
  orders_14d?: number;
  ctr?: number;
  cpc?: number;
  conversion_rate?: number;
  last_updated?: string;
  created_at: string;
}

export interface OptimizationResult {
  id: string;
  user_id: string;
  connection_id: string;
  optimization_type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  total_keywords_analyzed: number;
  total_recommendations: number;
  estimated_impact_spend?: number;
  estimated_impact_sales?: number;
  results_data?: any;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface OptimizationRecommendation {
  id: string;
  optimization_result_id: string;
  entity_type: 'keyword' | 'campaign' | 'adgroup';
  entity_id: string;
  recommendation_type: string;
  current_value?: string;
  recommended_value?: string;
  reasoning: string;
  impact_level: 'high' | 'medium' | 'low';
  estimated_impact?: number;
  applied: boolean;
  applied_at?: string;
  created_at: string;
}

export type AttributionWindow = '7d' | '14d';

export interface AttributionMetrics {
  acos_7d?: number;
  acos_14d?: number;
  roas_7d?: number;
  roas_14d?: number;
  sales_7d?: number;
  sales_14d?: number;
  orders_7d?: number;
  orders_14d?: number;
}