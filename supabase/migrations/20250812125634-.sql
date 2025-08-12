-- Restrict execution of the admin-grant helper to service_role only
DO $$
BEGIN
  -- If function exists, adjust privileges
  IF EXISTS (
    SELECT 1 
    FROM pg_proc p 
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'grant_admin_role_by_email'
      AND pg_get_function_identity_arguments(p.oid) = 'user_email text'
  ) THEN
    -- Revoke from broad roles
    REVOKE EXECUTE ON FUNCTION public.grant_admin_role_by_email(text) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.grant_admin_role_by_email(text) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.grant_admin_role_by_email(text) FROM authenticated;
    -- Allow only service_role to execute
    GRANT EXECUTE ON FUNCTION public.grant_admin_role_by_email(text) TO service_role;
  END IF;
END $$;