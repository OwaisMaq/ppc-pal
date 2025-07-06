
-- Add missing enum values to api_connection_status
ALTER TYPE api_connection_status ADD VALUE 'warning';
ALTER TYPE api_connection_status ADD VALUE 'setup_required';
