
export interface OAuthInitiateRequest {
  action: 'initiate';
  redirectUri: string;
}

export interface OAuthCallbackRequest {
  action: 'callback';
  code: string;
  state: string;
  redirectUri: string;
}

export type OAuthRequest = OAuthInitiateRequest | OAuthCallbackRequest;

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
}

export interface AmazonProfile {
  profileId: number;
  countryCode?: string;
  accountInfo?: {
    name?: string;
  };
}

export interface ConnectionData {
  user_id: string;
  profile_id: string;
  profile_name: string;
  marketplace_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  status: 'active';
}
