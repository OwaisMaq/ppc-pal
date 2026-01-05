-- Part 1: Remove free tier restrictions - give free tier same limits as pro
UPDATE usage_limits 
SET profile_limit = 100, optimization_limit = 1000 
WHERE plan_type = 'free';

UPDATE plan_entitlements 
SET 
  features = '{"alerts": true, "ams_realtime": true, "ams_all_datasets": true, "backfills": true, "manual_v3_pulls": true}'::jsonb,
  limits = '{"campaigns": 1000, "monthly_syncs": 10000, "profiles": 100}'::jsonb
WHERE plan = 'free';

-- Part 2: Admin approval system

-- Create approval status enum
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Add approval_status column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approval_status public.approval_status DEFAULT 'pending';

-- Add approved_at and approved_by columns for audit trail
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);

-- Auto-approve ALL existing users
UPDATE public.profiles SET approval_status = 'approved' WHERE approval_status IS NULL OR approval_status = 'pending';

-- Create function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid AND approval_status = 'approved'
  )
$$;

-- Create function to get pending users (for admin panel)
CREATE OR REPLACE FUNCTION public.get_pending_users()
RETURNS TABLE(
  id uuid,
  email text,
  created_at timestamptz,
  approval_status public.approval_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    u.email,
    p.created_at,
    p.approval_status
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.approval_status = 'pending'
  ORDER BY p.created_at DESC
$$;

-- Create function to approve/reject user (admin only)
CREATE OR REPLACE FUNCTION public.update_user_approval(
  target_user_id uuid,
  new_status public.approval_status
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can update user approval status';
  END IF;
  
  UPDATE public.profiles
  SET 
    approval_status = new_status,
    approved_at = CASE WHEN new_status = 'approved' THEN now() ELSE NULL END,
    approved_by = CASE WHEN new_status = 'approved' THEN auth.uid() ELSE NULL END
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;

-- RLS policy for profiles to allow users to see their own approval status
CREATE POLICY "Users can view own profile approval status"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- RLS policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policy for admins to update profiles
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));