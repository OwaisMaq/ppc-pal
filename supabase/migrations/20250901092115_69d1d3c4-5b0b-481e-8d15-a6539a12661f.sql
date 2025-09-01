-- Drop existing function if it exists due to return type mismatch
DROP FUNCTION IF EXISTS private.get_tokens(uuid, text);

-- Ensure secure token storage exists in private schema
create or replace function private.get_tokens(
  p_user_id uuid, 
  p_profile_id text
) returns table(access_token text, refresh_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = 'private','public','extensions'
as $$
declare 
  k text := current_setting('app.enc_key', true);
begin
  if k is null or k = '' then
    raise exception 'encryption key not set';
  end if;
  
  return query
  select
    pgp_sym_decrypt(t.access_token_encrypted, k)::text,
    pgp_sym_decrypt(t.refresh_token_encrypted, k)::text,
    t.expires_at
  from private.amazon_tokens t
  where t.user_id = p_user_id and t.profile_id = p_profile_id;
end $$;

-- Public RPC wrapper to support calling via supabase.rpc('private.store_tokens')
create or replace function public."private.store_tokens"(
  p_user_id uuid,
  p_profile_id text,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamptz
) returns void
language plpgsql
security definer
set search_path = 'public','private','extensions'
as $$
begin
  perform private.store_tokens(p_user_id, p_profile_id, p_access_token, p_refresh_token, p_expires_at);
end $$;

-- Public RPC to retrieve decrypted tokens given a profile id (infers user)
create or replace function public.get_tokens(p_profile_id text)
returns table(access_token text, refresh_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = 'public','private','extensions'
as $$
declare
  uid uuid;
  claims json;
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

  return query
  select * from private.get_tokens(uid, p_profile_id);
end $$;