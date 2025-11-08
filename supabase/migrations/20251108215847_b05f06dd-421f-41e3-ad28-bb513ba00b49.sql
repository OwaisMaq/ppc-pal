-- Add missing updated_at column to sync_jobs table
-- This column is required by the update_sync_jobs_updated_at trigger

ALTER TABLE public.sync_jobs 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();