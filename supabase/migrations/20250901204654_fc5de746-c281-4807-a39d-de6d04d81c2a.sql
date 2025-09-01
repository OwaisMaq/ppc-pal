-- Update the connection status to active for the user's profile
UPDATE amazon_connections 
SET status = 'active', updated_at = now() 
WHERE user_id = 'efa87435-8a57-46ad-91e7-c975e2439a2c' 
AND profile_id = '1364809047757418';