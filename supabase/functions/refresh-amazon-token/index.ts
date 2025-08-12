import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// AES-GCM helpers for encrypting/decrypting tokens at rest
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function fromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function getKey() {
  const secret = Deno.env.get('ENCRYPTION_KEY') || '';
  const hash = await crypto.subtle.digest('SHA-256', textEncoder.encode(secret));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function encryptText(plain: string): Promise<string> {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await getKey();
    const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(plain));
    return `${toBase64(iv)}:${toBase64(new Uint8Array(buf))}`;
  } catch {
    return plain;
  }
}
async function decryptText(enc: string): Promise<string> {
  try {
    if (!enc || !enc.includes(':')) return enc;
    const [ivB64, dataB64] = enc.split(':');
    const iv = fromBase64(ivB64);
    const key = await getKey();
    const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromBase64(dataB64));
    return textDecoder.decode(buf);
  } catch {
    return enc;
  }
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

    // Get the connection details (using service role)
    const { data: connection, error: connectionError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (connectionError || !connection) {
      throw new Error('Connection not found')
    }

    const refreshToken = await decryptText(connection.refresh_token)

    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
    
    if (!clientId || !clientSecret) {
      throw new Error('Amazon credentials not configured')
    }

    console.log('Attempting to refresh access token...')
    
    // Refresh the access token
    const refreshResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
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
      
      throw new Error('Token refresh failed - please reconnect your account')
    }

    const tokenData = await refreshResponse.json()
    console.log('Token refreshed successfully')

    // Calculate new expiry time (Amazon tokens typically last 1 hour)
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))

    // Update the connection with new tokens (encrypt at rest)
    const newAccessEnc = await encryptText(tokenData.access_token)
    const newRefreshEnc = await encryptText(tokenData.refresh_token || connection.refresh_token)

    const { error: updateError } = await supabase
      .from('amazon_connections')
      .update({
        access_token: newAccessEnc,
        refresh_token: newRefreshEnc, // Keep old (encrypted) if new one not provided
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
    const message = (error as Error)?.message || 'Unknown error'
    let code = 'TOKEN_REFRESH_ERROR'
    if (message.includes('No authorization header')) code = 'NO_AUTH'
    else if (message.includes('Invalid authorization')) code = 'INVALID_AUTH'
    else if (message.includes('Connection not found')) code = 'CONNECTION_NOT_FOUND'
    else if (message.includes('Amazon credentials not configured')) code = 'MISSING_AMAZON_CREDENTIALS'
    else if (message.includes('Token refresh failed')) code = 'REFRESH_FAILED'

    return new Response(
      JSON.stringify({ success: false, code, error: message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})