-- Create feature issue reports table for one-click error reporting
CREATE TABLE public.feature_issue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_id text NOT NULL,
  feature_label text,
  page_route text,
  issue_type text DEFAULT 'general',
  context jsonb,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_issue_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports
CREATE POLICY "Users can report issues"
ON public.feature_issue_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON public.feature_issue_reports
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.feature_issue_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update reports (mark as resolved)
CREATE POLICY "Admins can update reports"
ON public.feature_issue_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_feature_issue_reports_feature ON public.feature_issue_reports(feature_id);
CREATE INDEX idx_feature_issue_reports_created ON public.feature_issue_reports(created_at DESC);
CREATE INDEX idx_feature_issue_reports_resolved ON public.feature_issue_reports(resolved) WHERE resolved = false;