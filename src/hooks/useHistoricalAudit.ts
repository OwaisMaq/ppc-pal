import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AuditInsight {
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  campaigns: string[];
  estimatedSavings: number;
  impact: string;
  level: "campaign" | "search_term" | "keyword" | "target";
  entities?: string[];
}

export interface SearchTermBreakdown {
  searchTerm: string;
  keywordText: string;
  matchType: string;
  campaignId: string;
  spend: number;
  sales: number;
  clicks: number;
  impressions: number;
  orders: number;
  acos: number;
  roas: number;
}

export interface TargetBreakdown {
  targetId: string;
  targetType: string;
  expression: string;
  campaignId: string;
  spend: number;
  sales: number;
  clicks: number;
  impressions: number;
  orders: number;
  acos: number;
  roas: number;
}

export interface AuditBreakdown {
  searchTerms: {
    topWasters: SearchTermBreakdown[];
    topPerformers: SearchTermBreakdown[];
    highVolume: SearchTermBreakdown[];
  };
  targets: {
    topWasters: TargetBreakdown[];
    topPerformers: TargetBreakdown[];
    highVolume: TargetBreakdown[];
  };
}

export interface ScoreBreakdown {
  acosEfficiency: { score: number; value: number; weight: number };
  conversionRate: { score: number; value: number; weight: number };
  ctr: { score: number; value: number; weight: number };
  budgetUtilization: { score: number; value: number; weight: number };
  wasteRatio: { score: number; value: number; weight: number };
}

export interface AuditSummary {
  monthLabel: string;
  totalSpend: number;
  totalSales: number;
  totalOrders: number;
  avgAcos: number;
  avgRoas: number;
  campaignCount: number;
  searchTermCount?: number;
  targetCount?: number;
  aiSummary?: string;
}

export interface HistoricalAudit {
  id: string;
  user_id: string;
  profile_id: string;
  audit_month: string;
  insights: AuditInsight[];
  summary: AuditSummary;
  breakdown?: AuditBreakdown;
  estimated_savings: number;
  score?: number;
  grade?: string;
  score_breakdown?: ScoreBreakdown;
  trend_vs_prior_month?: "up" | "down" | "stable" | "new";
  status: string;
  created_at: string;
  updated_at: string;
}

export function useHistoricalAudit(profileId: string | null) {
  const { user } = useAuth();
  const [audits, setAudits] = useState<HistoricalAudit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAudits = useCallback(async (forceRefresh = false) => {
    if (!user || !profileId) return;

    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch(
        `https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/historical-audit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            profileId,
            forceRefresh,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch audits");
      }

      const data = await response.json();
      
      // Parse the insights, summary, breakdown, and score_breakdown from JSONB
      const parsedAudits: HistoricalAudit[] = (data.audits || []).map((audit: any) => ({
        ...audit,
        insights: typeof audit.insights === 'string' 
          ? JSON.parse(audit.insights) 
          : audit.insights || [],
        summary: typeof audit.summary === 'string' 
          ? JSON.parse(audit.summary) 
          : audit.summary || {},
        breakdown: typeof audit.breakdown === 'string'
          ? JSON.parse(audit.breakdown)
          : audit.breakdown || null,
        score_breakdown: typeof audit.score_breakdown === 'string'
          ? JSON.parse(audit.score_breakdown)
          : audit.score_breakdown || null,
      }));

      setAudits(parsedAudits);

      if (data.fromCache) {
        toast.info("Loaded cached audit results");
      } else if (parsedAudits.length > 0) {
        toast.success(`Audit complete: ${parsedAudits.length} months analyzed`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load audits";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [user, profileId]);

  const runAudit = useCallback(() => {
    return fetchAudits(true);
  }, [fetchAudits]);

  const getTotalSavings = useCallback(() => {
    return audits.reduce((sum, audit) => sum + (audit.estimated_savings || 0), 0);
  }, [audits]);

  const getTotalInsightsCount = useCallback(() => {
    return audits.reduce((sum, audit) => sum + (audit.insights?.length || 0), 0);
  }, [audits]);

  const getCriticalIssuesCount = useCallback(() => {
    return audits.reduce((sum, audit) => {
      const criticalInsights = audit.insights?.filter(i => i.severity === "critical") || [];
      return sum + criticalInsights.length;
    }, 0);
  }, [audits]);

  const getInsightsByLevel = useCallback((level: AuditInsight["level"]) => {
    return audits.flatMap(audit => 
      (audit.insights || []).filter(i => i.level === level)
    );
  }, [audits]);

  const getAverageScore = useCallback(() => {
    const auditsWithScores = audits.filter(a => a.score !== undefined && a.score !== null);
    if (auditsWithScores.length === 0) return null;
    const total = auditsWithScores.reduce((sum, a) => sum + (a.score || 0), 0);
    return Math.round(total / auditsWithScores.length);
  }, [audits]);

  const getScoreTrend = useCallback(() => {
    if (audits.length < 2) return "stable";
    const sortedAudits = [...audits].sort((a, b) => 
      new Date(a.audit_month).getTime() - new Date(b.audit_month).getTime()
    );
    const recentAudits = sortedAudits.slice(-3);
    if (recentAudits.length < 2) return "stable";
    
    const firstScore = recentAudits[0]?.score || 0;
    const lastScore = recentAudits[recentAudits.length - 1]?.score || 0;
    const diff = lastScore - firstScore;
    
    if (diff >= 10) return "improving";
    if (diff <= -10) return "declining";
    return "stable";
  }, [audits]);

  return {
    audits,
    loading,
    error,
    fetchAudits,
    runAudit,
    getTotalSavings,
    getTotalInsightsCount,
    getCriticalIssuesCount,
    getInsightsByLevel,
    getAverageScore,
    getScoreTrend,
  };
}
