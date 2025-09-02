-- Update the Amazon connection status to active for this user
UPDATE public.amazon_connections 
SET status = 'active'
WHERE user_id = 'efa87435-8a57-46ad-91e7-c975e2439a2c' 
  AND status = 'setup_required';