-- Fix connection status for existing connections that have valid tokens
-- This addresses connections marked as 'expired' when they shouldn't be
UPDATE public.amazon_connections 
SET 
  status = 'active',
  setup_required_reason = null,
  updated_at = now()
WHERE 
  status = 'expired' 
  AND token_expires_at > now() 
  AND access_token IS NOT NULL 
  AND refresh_token IS NOT NULL;