
// Amazon types that match the Supabase database schema
export interface AmazonConnection {
  id: string;
  user_id: string;
  profile_id: string;
  profile_name: string | null;
  marketplace_id: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  status: 'active' | 'expired' | 'error' | 'pending' | 'warning' | 'setup_required';
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AmazonProfile {
  id: string;
  name: string;
  countryCode: string;
  currencyCode: string;
}
