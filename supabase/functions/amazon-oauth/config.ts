
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function getAmazonCredentials() {
  const clientId = Deno.env.get('AMAZON_CLIENT_ID');
  const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('Amazon credentials not configured');
  }
  
  return { clientId, clientSecret };
}
