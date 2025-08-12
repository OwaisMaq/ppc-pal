-- Restrict execution of the admin-grant function to service_role only
-- and remove any implicit PUBLIC/authenticated grants.

DO $$
BEGIN
  -- Revoke execute from public-facing roles if the function exists
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'grant_admin_role_by_email'
      AND pg_get_function_identity_arguments(p.oid) = 'user_email text'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.grant_admin_role_by_email(text) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.grant_admin_role_by_email(text) FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.grant_admin_role_by_email(text) FROM anon;
    -- Allow only service_role to execute
    GRANT EXECUTE ON FUNCTION public.grant_admin_role_by_email(text) TO service_role;
  END IF;
END $$;

-- Safety: ensure RLS is enabled (should already be) and no direct grants override it on sensitive table
-- Note: RLS policies already restrict access; these are belt-and-suspenders checks that won't change behavior if already set.
ALTER TABLE public.amazon_connections ENABLE ROW LEVEL SECURITY;
