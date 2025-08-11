import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Encryption helpers (AES-256-GCM) for token at-rest protection
const enc = new TextEncoder();
const dec = new TextDecoder();

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function getKey(): Promise<CryptoKey> {
  const keyB64 = Deno.env.get('ENCRYPTION_KEY') ?? '';
  if (!keyB64) throw new Error('ENCRYPTION_KEY not configured');
  const raw = b64ToBytes(keyB64);
  if (raw.byteLength !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (base64)');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt','decrypt']);
}

async function encrypt(text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey();
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  return `${bytesToB64(iv)}:${bytesToB64(new Uint8Array(cipher))}`;
}

async function decrypt(payload: string): Promise<string> {
  const [ivB64, dataB64] = payload.split(':');
  if (!ivB64 || !dataB64) throw new Error('Invalid encrypted payload');
  const key = await getKey();
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(ivB64) }, key, b64ToBytes(dataB64));
  return dec.decode(new Uint8Array(plain));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authorization')
    }

    const { connectionId } = await req.json()
    console.log('Refreshing token for connection:', connectionId)

    // Get the connection details
    const { data: connection, error: connectionError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (connectionError || !connection) {
      throw new Error('Connection not found')
    }

    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
    
    if (!clientId || !clientSecret) {
      throw new Error('Amazon credentials not configured')
    }

    console.log('Attempting to refresh access token...')
    
    // Refresh the access token
    const refreshTokenPlain = await (async () => {
      try { return await decrypt(connection.refresh_token); } catch (_) { return connection.refresh_token; }
    })();

    const refreshResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshTokenPlain,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text()
      console.error('Token refresh failed:', errorText)
      
      // Mark connection as expired if refresh fails
      await supabase
        .from('amazon_connections')
        .update({ 
          status: 'expired',
          setup_required_reason: 'Token refresh failed - please reconnect'
        })
        .eq('id', connectionId)
      
      // Log security incident
      await supabase.from('security_incidents').insert({
        user_id: user.id,
        category: 'amazon_token',
        severity: 'high',
        status: 'open',
        description: 'Amazon token refresh failed',
        details: { connection_id: connectionId, error: errorText }
      })
      
      throw new Error('Token refresh failed - please reconnect your account')
    }

    const tokenData = await refreshResponse.json()
    console.log('Token refreshed successfully')

    // Calculate new expiry time (Amazon tokens typically last 1 hour)
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))

    // Update the connection with new tokens (encrypt before storing)
    const encAccess = await encrypt(tokenData.access_token)
    const encRefresh = tokenData.refresh_token ? await encrypt(tokenData.refresh_token) : null

    const { error: updateError } = await supabase
      .from('amazon_connections')
      .update({
        access_token: encAccess,
        refresh_token: encRefresh || connection.refresh_token, // Keep old encrypted refresh token if new one not provided
        token_expires_at: expiresAt.toISOString(),
        status: 'active',
        setup_required_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    if (updateError) {
      console.error('Failed to update connection:', updateError)
      throw new Error('Failed to update connection with new tokens')
    }

    console.log('Connection updated with new tokens')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Token refreshed successfully',
        expires_at: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Token refresh error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})