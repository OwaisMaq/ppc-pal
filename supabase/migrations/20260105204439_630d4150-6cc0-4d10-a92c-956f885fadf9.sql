-- Grant table permissions to authenticated users for amazon_connections
GRANT SELECT, INSERT, UPDATE, DELETE ON public.amazon_connections TO authenticated;

-- Also ensure the anon role has no access (for security)
REVOKE ALL ON public.amazon_connections FROM anon;