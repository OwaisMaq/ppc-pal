
export interface ProfileValidationResult {
  isValid: boolean;
  reason?: string;
}

export const validateProfileConfiguration = (connection: any): ProfileValidationResult => {
  console.log('=== Validating Profile Configuration ===');
  console.log('Profile ID:', connection.profile_id);
  console.log('Profile Name:', connection.profile_name);

  if (!connection.profile_id) {
    return { isValid: false, reason: 'No profile ID configured' };
  }

  if (connection.profile_id === 'setup_required_no_profiles_found') {
    return { isValid: false, reason: 'No advertising profiles found' };
  }

  if (connection.profile_id.includes('error') || connection.profile_id === 'invalid') {
    return { isValid: false, reason: 'Invalid profile configuration' };
  }

  // Check if profile ID looks like a valid Amazon profile ID (should be numeric)
  if (!/^\d+$/.test(connection.profile_id)) {
    return { isValid: false, reason: 'Profile ID format appears invalid' };
  }

  console.log('Profile configuration is valid');
  return { isValid: true };
};

export const determineConnectionStatus = async (conn: any, updateConnectionStatus: Function) => {
  console.log(`=== Processing Connection Status ===`);
  console.log('Connection details:', {
    id: conn.id,
    profile_id: conn.profile_id,
    profile_name: conn.profile_name,
    status: conn.status,
    marketplace_id: conn.marketplace_id,
    last_sync_at: conn.last_sync_at,
    campaigns: conn.campaigns
  });
  
  const campaignCount = Array.isArray(conn.campaigns) ? conn.campaigns.length : 0;
  
  // Use the database status as the primary source of truth
  let connectionStatus = conn.status;
  let setupRequiredReason: string | undefined;
  
  // Check token expiry first
  const tokenExpiry = new Date(conn.token_expires_at);
  const now = new Date();
  if (tokenExpiry <= now && connectionStatus !== 'expired') {
    connectionStatus = 'expired';
    setupRequiredReason = 'token_expired';
    console.log('Status: expired (token expired)');
    await updateConnectionStatus(conn.id, 'error', 'Token expired');
  } else {
    // For non-expired connections, interpret the status more intelligently
    switch (connectionStatus) {
      case 'active':
        // Active means successfully synced, regardless of campaign count
        console.log('Status: active (confirmed by database)');
        break;
        
      case 'setup_required':
        // Validate what kind of setup is required
        const profileValidation = validateProfileConfiguration(conn);
        if (!profileValidation.isValid) {
          setupRequiredReason = 'no_advertising_profiles';
          console.log('Status: setup_required (no advertising profiles)');
        } else if (!conn.last_sync_at) {
          setupRequiredReason = 'needs_sync';
          console.log('Status: setup_required (needs initial sync)');
        } else {
          // Connection is properly configured, might just need a sync
          connectionStatus = 'active';
          console.log('Status: active (setup completed, sync successful)');
        }
        break;
        
      case 'warning':
        // Warning status - connection works but has issues
        console.log('Status: warning (connection has issues but functional)');
        break;
        
      case 'error':
        setupRequiredReason = 'connection_error';
        console.log('Status: error (connection has errors)');
        break;
        
      default:
        console.log('Status from DB:', connectionStatus);
    }
  }

  // Determine needs_sync flag
  const needsSync = !conn.last_sync_at || connectionStatus === 'setup_required';
  
  return {
    connectionStatus,
    setupRequiredReason,
    needsSync,
    campaignCount
  };
};
