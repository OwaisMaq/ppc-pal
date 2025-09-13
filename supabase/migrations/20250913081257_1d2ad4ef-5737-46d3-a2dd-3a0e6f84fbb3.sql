-- Fix connection status for existing connections that should be active
-- This addresses connections marked as 'expired' when tokens may still be valid
UPDATE public.amazon_connections 
SET 
  status = 'active',
  setup_required_reason = null,
  updated_at = now()
WHERE 
  status = 'expired' 
  AND token_expires_at > now();