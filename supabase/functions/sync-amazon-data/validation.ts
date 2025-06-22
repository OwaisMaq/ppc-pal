
export function validateProfileId(profileId: string): boolean {
  const invalidProfileIds = ['needs_setup', 'unknown'];
  const invalidPrefixes = ['profile_'];
  
  return !invalidProfileIds.includes(profileId) && 
         !invalidPrefixes.some(prefix => profileId.startsWith(prefix));
}

export function validateConnection(connection: any): void {
  if (!validateProfileId(connection.profile_id)) {
    console.error('Invalid profile ID detected:', connection.profile_id);
    throw new Error('This connection has an invalid profile ID and needs to be reconnected. Please disconnect and reconnect your Amazon account.');
  }

  if (connection.status !== 'active') {
    throw new Error('Connection is not active');
  }
}
