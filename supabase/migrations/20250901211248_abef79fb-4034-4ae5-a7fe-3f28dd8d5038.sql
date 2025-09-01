-- Fix the connection status to active
UPDATE amazon_connections 
SET status = 'active', updated_at = now() 
WHERE user_id = 'efa87435-8a57-46ad-91e7-c975e2439a2c' 
AND status = 'setup_required';