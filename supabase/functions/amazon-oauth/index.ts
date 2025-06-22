
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from './config.ts';
import { validateUser } from './auth.ts';
import { handleOAuthInitiate } from './oauth-initiate.ts';
import { handleOAuthCallback } from './oauth-callback.ts';
import { retryProfileFetch } from './connections.ts';
import type { OAuthRequest } from './types.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate user session
    const { user } = await validateUser(req.headers.get('Authorization'));

    const requestData: OAuthRequest = await req.json();
    console.log('Amazon OAuth action:', requestData.action);

    if (requestData.action === 'initiate') {
      const result = handleOAuthInitiate(requestData, user.id);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (requestData.action === 'callback') {
      const result = await handleOAuthCallback(requestData, user.id);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (requestData.action === 'retry-profiles') {
      const result = await retryProfileFetch((requestData as any).connectionId);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Amazon OAuth error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check edge function logs for more information'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
