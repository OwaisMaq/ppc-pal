-- Phase 2A: Secure token storage setup
-- Enable pgcrypto extension for encryption
create extension if not exists pgcrypto;

-- Create private schema for secrets
create schema if not exists private;

-- Create encrypted tokens table in private schema
create table if not exists private.amazon_tokens (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null,
  access_token_encrypted bytea not null,
  refresh_token_encrypted bytea not null,
  expires_at timestamptz not null,
  encryption_version smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, profile_id)
);

-- Enable RLS on private tokens table (deny by default)
alter table private.amazon_tokens enable row level security;

-- Create restrictive RLS policies
create policy "no_direct_select" on private.amazon_tokens
  for select using (false);

create policy "own_write_via_rpc" on private.amazon_tokens
  for insert with check (auth.uid() = user_id);

create policy "own_update_via_rpc" on private.amazon_tokens
  for update using (auth.uid() = user_id);

-- Create safe public view (no tokens exposed)
create or replace view public.amazon_connections_safe as
select
  c.id,
  c.user_id,
  c.profile_id,
  c.profile_name,
  c.marketplace_id,
  c.advertising_api_endpoint,
  c.reporting_api_version,
  c.status,
  c.health_status,
  c.last_sync_at,
  c.last_health_check,
  c.campaign_count,
  c.created_at,
  c.updated_at
from public.amazon_connections c;

-- Security definer function to store encrypted tokens
create or replace function private.store_tokens(
  p_user_id uuid,
  p_profile_id text,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamptz
) returns void
language plpgsql
security definer
as $$
declare 
  k text := current_setting('app.enc_key', true);
begin
  if k is null or k = '' then
    raise exception 'encryption key not set';
  end if;

  insert into private.amazon_tokens (
    user_id, 
    profile_id, 
    access_token_encrypted, 
    refresh_token_encrypted, 
    expires_at
  )
  values (
    p_user_id,
    p_profile_id,
    pgp_sym_encrypt(p_access_token, k, 'compress-algo=1, cipher-algo=aes256'),
    pgp_sym_encrypt(p_refresh_token, k, 'compress-algo=1, cipher-algo=aes256'),
    p_expires_at
  )
  on conflict (user_id, profile_id) do update set
    access_token_encrypted = excluded.access_token_encrypted,
    refresh_token_encrypted = excluded.refresh_token_encrypted,
    expires_at = excluded.expires_at,
    updated_at = now();
end $$;

-- Security definer function to retrieve decrypted tokens
create or replace function private.get_tokens(
  p_user_id uuid, 
  p_profile_id text
) returns table(access_token text, refresh_token text, expires_at timestamptz)
language plpgsql
security definer
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

-- Helper function to set config (for edge functions)
create or replace function public.set_config(
  key text,
  value text,
  is_local boolean default true
) returns void
language plpgsql
security definer
as $$
begin
  perform set_config(key, value, is_local);
end $$;