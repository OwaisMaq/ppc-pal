
-- 1) Fix feedback policies
drop policy if exists "Admin can view all feedback" on public.feedback;

-- Ensure RLS enabled (it already is, but keeping for safety)
alter table public.feedback enable row level security;

-- Owner read
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='feedback' 
      and policyname='Users can view their own feedback'
  ) then
    create policy "Users can view their own feedback"
      on public.feedback for select
      using (auth.uid() = user_id);
  end if;
end $$;

-- Owner write (insert already exists via your schema; keep idempotent)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='feedback' 
      and policyname='Users can insert their own feedback'
  ) then
    create policy "Users can insert their own feedback"
      on public.feedback for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Owner update/delete
create policy if not exists "Users can update their own feedback"
  on public.feedback for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their own feedback"
  on public.feedback for delete
  using (auth.uid() = user_id);

-- Admin read all
create policy if not exists "Admins can view all feedback"
  on public.feedback for select
  using (public.has_role(auth.uid(), 'admin'));

-- Admin update/delete all
create policy if not exists "Admins can update all feedback"
  on public.feedback for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy if not exists "Admins can delete all feedback"
  on public.feedback for delete
  using (public.has_role(auth.uid(), 'admin'));



-- 2) Harden SECURITY DEFINER usage functions (keep same names/signatures)

-- can_user_optimize: enforce auth.uid()
create or replace function public.can_user_optimize(user_uuid uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $func$
declare
  _user uuid;
  user_plan public.subscription_plan;
  current_usage integer;
  usage_limit integer;
  is_admin boolean;
begin
  _user := auth.uid();
  if _user is null then
    return false;
  end if;

  if user_uuid is not null and user_uuid <> _user then
    raise exception 'Unauthorized subject';
  end if;

  -- Admin shortcut
  select public.has_role(_user, 'admin') into is_admin;
  if is_admin then
    return true;
  end if;

  -- Get user's current plan
  select plan_type into user_plan
  from public.subscriptions
  where user_id = _user and status = 'active';

  if user_plan is null then
    user_plan := 'free';
  end if;

  -- Get usage limit
  select optimization_limit into usage_limit
  from public.usage_limits
  where plan_type = user_plan;

  -- Get current usage for this month
  select coalesce(optimizations_used, 0) into current_usage
  from public.usage_tracking
  where user_id = _user
    and period_start = date_trunc('month', now());

  if current_usage is null then
    insert into public.usage_tracking (user_id, optimizations_used)
    values (_user, 0)
    on conflict (user_id, period_start) do nothing;
    current_usage := 0;
  end if;

  return current_usage < usage_limit;
end;
$func$;

-- increment_optimization_usage: enforce auth.uid()
create or replace function public.increment_optimization_usage(user_uuid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $func$
declare
  _user uuid;
begin
  _user := auth.uid();
  if _user is null then
    raise exception 'Not authenticated';
  end if;

  if user_uuid is not null and user_uuid <> _user then
    raise exception 'Unauthorized subject';
  end if;

  insert into public.usage_tracking (user_id, optimizations_used)
  values (_user, 1)
  on conflict (user_id, period_start)
  do update set
    optimizations_used = public.usage_tracking.optimizations_used + 1,
    updated_at = now();
end;
$func$;

-- create_optimization_batch: enforce auth.uid()
create or replace function public.create_optimization_batch(user_uuid uuid, connection_uuid uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $func$
declare
  result_id uuid;
  _user uuid;
begin
  _user := auth.uid();
  if _user is null then
    raise exception 'Not authenticated';
  end if;

  if user_uuid is not null and user_uuid <> _user then
    raise exception 'Unauthorized subject';
  end if;

  insert into public.optimization_results (user_id, connection_id, optimization_type, status)
  values (_user, connection_uuid, 'full_optimization', 'pending')
  returning id into result_id;

  return result_id;
end;
$func$;



-- 3) Lock down grant_admin_role_by_email and trigger helpers

-- Harden grant_admin_role_by_email (require current admin OR service_role)
create or replace function public.grant_admin_role_by_email(user_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $func$
declare
  target_user_id uuid;
  caller_is_admin boolean;
begin
  -- Allow service_role implicitly (bypasses RLS), but block normal users unless admin
  select public.has_role(auth.uid(), 'admin') into caller_is_admin;
  if auth.role() <> 'service_role' and coalesce(caller_is_admin, false) = false then
    raise exception 'Only administrators can grant roles';
  end if;

  select id into target_user_id
  from auth.users
  where email = user_email;

  if target_user_id is not null then
    insert into public.user_roles (user_id, role)
    values (target_user_id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
end;
$func$;

-- Restrict EXECUTE privileges
revoke execute on function public.grant_admin_role_by_email(text) from anon, authenticated;

-- Trigger helpers should not be callable by clients; revoke execute
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.handle_new_user_subscription() from anon, authenticated;



-- 4) Remove column-level exposure of Amazon tokens
revoke select (access_token, refresh_token) on table public.amazon_connections from anon;
revoke select (access_token, refresh_token) on table public.amazon_connections from authenticated;



-- 5) Set explicit search_path on simple triggers to satisfy linter

create or replace function public.update_documentation_updated_at()
returns trigger
language plpgsql
set search_path = public
as $func$
begin
  new.updated_at = now();
  return new;
end;
$func$;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $func$
begin
  new.updated_at = now();
  return new;
end;
$func$;
