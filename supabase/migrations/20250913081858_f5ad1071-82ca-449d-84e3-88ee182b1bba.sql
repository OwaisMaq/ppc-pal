-- Update the get_tokens function to handle encryption key properly
CREATE OR REPLACE FUNCTION public.get_tokens(p_profile_id text)
RETURNS TABLE(access_token text, refresh_token text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions'
AS $function$
declare
  uid uuid;
  claims json;
  encryption_key text;
begin
  -- Try to read authenticated user id from request.jwt.claims
  begin
    claims := current_setting('request.jwt.claims', true)::json;
    uid := coalesce((claims->>'sub')::uuid, null);
  exception when others then
    uid := null;
  end;
  
  -- Fallback to owner of the connection
  if uid is null then
    select user_id into uid
    from public.amazon_connections
    where profile_id = p_profile_id
    order by updated_at desc
    limit 1;
  end if;

  -- Get encryption key from environment (this is now done in the edge function)
  -- We'll pass this from the edge function via session config
  begin
    encryption_key := current_setting('app.enc_key', true);
  exception when others then
    -- If no encryption key in session, this means edge function should have set it
    -- But we'll still try to return tokens for backward compatibility
    encryption_key := null;
  end;

  -- Call the private function with or without encryption key
  if encryption_key is not null then
    return query
    select * from private.get_tokens(uid, p_profile_id, encryption_key);
  else
    -- Try without encryption key (for backward compatibility)
    return query
    select * from private.get_tokens(uid, p_profile_id);
  end if;
end $function$;