import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export interface IssueReport {
  id: string;
  user_id: string;
  feature_id: string;
  feature_label: string | null;
  page_route: string | null;
  issue_type: string | null;
  context: Record<string, unknown> | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export type IssueType = 'not_loading' | 'wrong_data' | 'button_broken' | 'crashed' | 'other' | 'general';

export const ISSUE_TYPES: { value: IssueType; label: string }[] = [
  { value: 'not_loading', label: 'Not loading' },
  { value: 'wrong_data', label: 'Wrong data shown' },
  { value: 'button_broken', label: 'Button not working' },
  { value: 'crashed', label: 'Crashed or froze' },
  { value: 'other', label: 'Other issue' },
];

interface SubmitReportInput {
  featureId: string;
  featureLabel?: string;
  issueType?: IssueType;
  context?: Record<string, unknown>;
}

export function useIssueReports() {
  const { user } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Submit a new issue report
  const submitReport = useCallback(async (input: SubmitReportInput) => {
    if (!user) {
      toast.error('You must be logged in to report an issue');
      return false;
    }

    try {
      const { error } = await supabase
        .from('feature_issue_reports')
        .insert([{
          user_id: user.id,
          feature_id: input.featureId,
          feature_label: input.featureLabel || null,
          page_route: location.pathname,
          issue_type: input.issueType || 'general',
          context: (input.context || null) as unknown as null,
        }]);

      if (error) {
        console.error('Error submitting issue report:', error);
        toast.error('Failed to submit report');
        return false;
      }

      toast.success('Issue reported. Thanks for helping us improve!');
      queryClient.invalidateQueries({ queryKey: ['issue-reports'] });
      return true;
    } catch (err) {
      console.error('Error submitting issue report:', err);
      toast.error('Failed to submit report');
      return false;
    }
  }, [user, location.pathname, queryClient]);

  return { submitReport };
}

// Admin hook for viewing all reports
export function useAdminIssueReports() {
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['issue-reports', 'admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_issue_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error fetching issue reports:', error);
        return [];
      }

      return data as IssueReport[];
    },
  });

  const resolveReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('feature_issue_reports')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-reports'] });
      toast.success('Report marked as resolved');
    },
    onError: () => {
      toast.error('Failed to resolve report');
    },
  });

  const unresolveReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('feature_issue_reports')
        .update({
          resolved: false,
          resolved_at: null,
          resolved_by: null,
        })
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-reports'] });
      toast.success('Report reopened');
    },
    onError: () => {
      toast.error('Failed to reopen report');
    },
  });

  // Aggregate stats
  const stats = {
    total: reports.length,
    unresolved: reports.filter(r => !r.resolved).length,
    last7Days: reports.filter(r => {
      const reportDate = new Date(r.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return reportDate >= weekAgo;
    }).length,
    byFeature: reports.reduce((acc, r) => {
      const key = r.feature_id;
      if (!acc[key]) {
        acc[key] = { count: 0, label: r.feature_label || r.feature_id, unresolved: 0 };
      }
      acc[key].count++;
      if (!r.resolved) acc[key].unresolved++;
      return acc;
    }, {} as Record<string, { count: number; label: string; unresolved: number }>),
  };

  return {
    reports,
    isLoading,
    stats,
    resolveReport: resolveReport.mutate,
    unresolveReport: unresolveReport.mutate,
    isResolving: resolveReport.isPending,
  };
}
