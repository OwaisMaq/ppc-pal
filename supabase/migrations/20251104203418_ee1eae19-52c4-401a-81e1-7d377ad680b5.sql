-- Add SNS topic ARN column to ams_subscriptions table
ALTER TABLE public.ams_subscriptions 
ADD COLUMN IF NOT EXISTS sns_topic_arn TEXT;