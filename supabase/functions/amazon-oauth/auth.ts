
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function validateUser(authHeader: string | null) {
  if (!authHeader) {
    console.error('No authorization header provided');
    throw new Error('No authorization header');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.error('Auth error:', authError);
    throw new Error('Invalid authorization');
  }

  console.log('Processing request for user:', user.id);
  return { user, supabase };
}
