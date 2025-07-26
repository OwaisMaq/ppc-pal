-- Add advertising_api_endpoint column to amazon_connections table
ALTER TABLE public.amazon_connections 
ADD COLUMN advertising_api_endpoint TEXT;