
export interface SyncResponse {
  success: boolean;
  message: string;
  campaignsSynced?: number;
  campaignCount?: number;
  syncStatus?: string;
  error?: string;
  errorType?: string;
  requiresReconnection?: boolean;
  requiresSetup?: boolean;
  details?: string;
}

export type ConnectionStatus = 'active' | 'expired' | 'error' | 'pending' | 'warning' | 'setup_required';
