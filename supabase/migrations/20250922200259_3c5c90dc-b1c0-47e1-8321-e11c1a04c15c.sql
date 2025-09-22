-- Add encrypted token columns to amazon_connections table
ALTER TABLE public.amazon_connections 
ADD COLUMN IF NOT EXISTS access_token_encrypted text,
ADD COLUMN IF NOT EXISTS refresh_token_encrypted text;