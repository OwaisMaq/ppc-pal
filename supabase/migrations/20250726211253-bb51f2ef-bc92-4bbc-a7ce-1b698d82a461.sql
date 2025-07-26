-- Add unique constraint on user_id and profile_id for amazon_connections table
-- This will allow the upsert operation in the edge function to work properly
ALTER TABLE public.amazon_connections 
ADD CONSTRAINT amazon_connections_user_profile_unique 
UNIQUE (user_id, profile_id);