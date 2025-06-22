
export async function getConnection(
  connectionId: string,
  userId: string,
  supabase: any
): Promise<any> {
  const { data: connection, error: connectionError } = await supabase
    .from('amazon_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single();

  if (connectionError || !connection) {
    console.error('Connection error:', connectionError);
    throw new Error('Connection not found');
  }

  return connection;
}

export async function updateConnectionStatus(
  connectionId: string,
  status: string,
  supabase: any,
  errorMessage?: string
): Promise<void> {
  const updateData: any = {
    status,
    last_sync_at: new Date().toISOString()
  };

  await supabase
    .from('amazon_connections')
    .update(updateData)
    .eq('id', connectionId);
}

export async function updateLastSyncTime(
  connectionId: string,
  supabase: any
): Promise<void> {
  await supabase
    .from('amazon_connections')
    .update({ 
      last_sync_at: new Date().toISOString(),
      status: 'active'
    })
    .eq('id', connectionId);
}
