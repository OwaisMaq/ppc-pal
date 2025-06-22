
export function validateProfileId(profileId: string): boolean {
  // Enhanced profile ID validation
  const invalidProfileIds = ['needs_setup', 'unknown', 'setup_required', '', null, undefined];
  const invalidPrefixes = ['profile_', 'temp_', 'placeholder_'];
  
  if (!profileId || typeof profileId !== 'string') {
    console.error('Profile ID is null, undefined, or not a string:', profileId);
    return false;
  }
  
  if (invalidProfileIds.includes(profileId.toLowerCase())) {
    console.error('Profile ID is in invalid list:', profileId);
    return false;
  }
  
  if (invalidPrefixes.some(prefix => profileId.toLowerCase().startsWith(prefix))) {
    console.error('Profile ID has invalid prefix:', profileId);
    return false;
  }
  
  // Amazon profile IDs should be numeric strings
  if (!/^\d+$/.test(profileId)) {
    console.error('Profile ID is not a valid numeric string:', profileId);
    return false;
  }
  
  console.log('✓ Profile ID validation passed:', profileId);
  return true;
}

export function validateConnection(connection: any): void {
  console.log('=== CONNECTION VALIDATION ===');
  console.log('Connection ID:', connection.id);
  console.log('Profile ID:', connection.profile_id);
  console.log('Status:', connection.status);
  console.log('Marketplace:', connection.marketplace_id);
  console.log('Token expires at:', connection.token_expires_at);
  
  if (!validateProfileId(connection.profile_id)) {
    console.error('VALIDATION FAILED: Invalid profile ID detected:', connection.profile_id);
    throw new Error(`This connection has an invalid profile ID (${connection.profile_id}) and needs to be reconnected. Please disconnect and reconnect your Amazon account.`);
  }

  if (connection.status !== 'active') {
    console.error('VALIDATION FAILED: Connection is not active, status:', connection.status);
    throw new Error(`Connection is not active (status: ${connection.status}). Please check your connection status.`);
  }
  
  // Check token expiry
  const now = new Date();
  const expiresAt = new Date(connection.token_expires_at);
  if (now >= expiresAt) {
    console.error('VALIDATION FAILED: Token has expired');
    throw new Error('Access token has expired. The sync process will attempt to refresh it.');
  }
  
  // Validate required fields
  if (!connection.access_token || !connection.refresh_token) {
    console.error('VALIDATION FAILED: Missing access or refresh token');
    throw new Error('Connection is missing required authentication tokens. Please reconnect your Amazon account.');
  }
  
  console.log('✓ Connection validation passed successfully');
}
