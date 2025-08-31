-- Remove token columns from amazon_connections table for security
-- Tokens are now stored in private.amazon_tokens table

ALTER TABLE public.amazon_connections 
DROP COLUMN IF EXISTS access_token,
DROP COLUMN IF EXISTS refresh_token;