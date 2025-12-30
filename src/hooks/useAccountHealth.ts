import { useMemo } from 'react';
import { useHistoricalAudit } from './useHistoricalAudit';
import { useGovernance } from './useGovernance';
import { differenceInHours } from 'date-fns';

export type HealthStatus = 'healthy' | 'watch' | 'at_risk';

export interface HealthSignals {
  auditScore: number | null;
  auditGrade: string | null;
  newAnomalyCount: number;
  criticalAlertsCount: number;
  warningAlertsCount: number;
  automationPaused: boolean;
  enabledRulesCount: number;
  totalRulesCount: number;
  dataFreshness: 'fresh' | 'stale' | 'unknown';
  hoursSinceSync: number | null;
  acosVsTarget: number | null;
  recentFailures: number;
}

export interface AccountHealthResult {
  status: HealthStatus;
  score: number; // 0-100
  reasons: string[];
  signals: HealthSignals;
  loading: boolean;
}

interface AccountHealthOptions {
  alerts?: { level: string; state: string }[];
  rules?: { enabled: boolean }[];
  anomalies?: { severity: string; state: string }[];
  lastSyncAt?: string | null;
  currentAcos?: number;
  targetAcos?: number;
  recentActionFailures?: number;
}

// Weighted scoring system
const WEIGHTS = {
  auditScore: 0.25,      // 25%
  criticalAlerts: 0.20,  // 20%
  anomalies: 0.15,       // 15%
  acosVsTarget: 0.15,    // 15%
  automationStatus: 0.15, // 15%
  dataFreshness: 0.10,   // 10%
};

function getLatestAuditScore(audits: any[]): { score: number | null; grade: string | null } {
  if (!audits || audits.length === 0) return { score: null, grade: null };
  
  // Find the most recent audit with a score
  const sortedAudits = [...audits].sort((a, b) => 
    new Date(b.month_start).getTime() - new Date(a.month_start).getTime()
  );
  
  const latestWithScore = sortedAudits.find(a => a.score !== null && a.score !== undefined);
  if (!latestWithScore) return { score: null, grade: null };
  
  return { 
    score: latestWithScore.score, 
    grade: latestWithScore.grade || null 
  };
}

function countNewAnomalies(anomalies?: { severity: string; state: string }[]): number {
  if (!anomalies) return 0;
  return anomalies.filter(a => a.state === 'new' && a.severity !== 'info').length;
}

function countAlertsByLevel(alerts?: { level: string; state: string }[], level?: string): number {
  if (!alerts) return 0;
  return alerts.filter(a => 
    a.state === 'new' && 
    (level ? a.level === level : true)
  ).length;
}

function calculateDataFreshness(lastSyncAt?: string | null): { freshness: 'fresh' | 'stale' | 'unknown'; hours: number | null } {
  if (!lastSyncAt) return { freshness: 'unknown', hours: null };
  
  const hours = differenceInHours(new Date(), new Date(lastSyncAt));
  
  if (hours <= 24) return { freshness: 'fresh', hours };
  if (hours <= 48) return { freshness: 'stale', hours };
  return { freshness: 'stale', hours };
}

function calculateHealthScore(signals: HealthSignals): number {
  let score = 0;
  let appliedWeight = 0;

  // 1. Audit Score (25%) - Scale 0-100 to 0-25
  if (signals.auditScore !== null) {
    score += (signals.auditScore / 100) * WEIGHTS.auditScore * 100;
    appliedWeight += WEIGHTS.auditScore;
  }

  // 2. Critical Alerts (20%) - Inverse: more alerts = lower score
  const alertScore = signals.criticalAlertsCount === 0 ? 100 :
                     signals.criticalAlertsCount <= 2 ? 50 : 0;
  score += (alertScore / 100) * WEIGHTS.criticalAlerts * 100;
  appliedWeight += WEIGHTS.criticalAlerts;

  // 3. Anomalies (15%) - Inverse: more anomalies = lower score
  const anomalyScore = signals.newAnomalyCount === 0 ? 100 :
                       signals.newAnomalyCount <= 3 ? 60 : 20;
  score += (anomalyScore / 100) * WEIGHTS.anomalies * 100;
  appliedWeight += WEIGHTS.anomalies;

  // 4. ACoS vs Target (15%)
  if (signals.acosVsTarget !== null) {
    const acosScore = signals.acosVsTarget <= 0 ? 100 :     // At or below target
                      signals.acosVsTarget < 5 ? 70 :        // Within 5% above target
                      signals.acosVsTarget < 10 ? 40 : 10;   // 10%+ above target
    score += (acosScore / 100) * WEIGHTS.acosVsTarget * 100;
    appliedWeight += WEIGHTS.acosVsTarget;
  }

  // 5. Automation Status (15%)
  let automationScore = 100;
  if (signals.automationPaused) {
    automationScore = 30; // Paused is concerning
  } else if (signals.totalRulesCount > 0) {
    const ruleRatio = signals.enabledRulesCount / signals.totalRulesCount;
    automationScore = ruleRatio >= 1 ? 100 : ruleRatio >= 0.5 ? 70 : 40;
  } else {
    automationScore = 50; // No rules configured
  }
  // Penalize for recent failures
  if (signals.recentFailures > 0) {
    automationScore = Math.max(0, automationScore - signals.recentFailures * 10);
  }
  score += (automationScore / 100) * WEIGHTS.automationStatus * 100;
  appliedWeight += WEIGHTS.automationStatus;

  // 6. Data Freshness (10%)
  const freshnessScore = signals.dataFreshness === 'fresh' ? 100 :
                         signals.dataFreshness === 'stale' ? 40 : 20;
  score += (freshnessScore / 100) * WEIGHTS.dataFreshness * 100;
  appliedWeight += WEIGHTS.dataFreshness;

  // Normalize if not all weights were applied
  if (appliedWeight > 0 && appliedWeight < 1) {
    score = score / appliedWeight;
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

function generateHealthReasons(signals: HealthSignals, score: number): string[] {
  const reasons: string[] = [];

  // Audit score
  if (signals.auditScore !== null && signals.auditScore < 60) {
    reasons.push(`Account health score is below target (${signals.auditGrade || 'D/F'} grade)`);
  }

  // Critical alerts
  if (signals.criticalAlertsCount > 0) {
    reasons.push(`${signals.criticalAlertsCount} critical alert${signals.criticalAlertsCount > 1 ? 's' : ''} require${signals.criticalAlertsCount === 1 ? 's' : ''} attention`);
  }

  // Warning alerts
  if (signals.warningAlertsCount > 2) {
    reasons.push(`${signals.warningAlertsCount} warning alerts detected`);
  }

  // Anomalies
  if (signals.newAnomalyCount > 0) {
    reasons.push(`${signals.newAnomalyCount} new anomal${signals.newAnomalyCount > 1 ? 'ies' : 'y'} detected`);
  }

  // ACoS
  if (signals.acosVsTarget !== null && signals.acosVsTarget > 5) {
    reasons.push(`ACoS is ${signals.acosVsTarget.toFixed(0)}% above target`);
  }

  // Automation
  if (signals.automationPaused) {
    reasons.push('Automation is paused - protection limited');
  } else if (signals.totalRulesCount > 0 && signals.enabledRulesCount === 0) {
    reasons.push('No automation rules are active');
  } else if (signals.totalRulesCount === 0) {
    reasons.push('No automation rules configured');
  }

  // Recent failures
  if (signals.recentFailures > 0) {
    reasons.push(`${signals.recentFailures} automation action${signals.recentFailures > 1 ? 's' : ''} failed recently`);
  }

  // Data freshness
  if (signals.dataFreshness === 'stale' && signals.hoursSinceSync !== null) {
    const days = Math.floor(signals.hoursSinceSync / 24);
    reasons.push(`Data hasn't synced in ${days > 0 ? `${days} day${days > 1 ? 's' : ''}` : `${signals.hoursSinceSync} hours`}`);
  } else if (signals.dataFreshness === 'unknown') {
    reasons.push('No data sync detected');
  }

  return reasons;
}

export function useAccountHealth(
  profileId: string | null,
  options: AccountHealthOptions = {}
): AccountHealthResult {
  const { audits, loading: auditsLoading } = useHistoricalAudit(profileId);
  const { settings, loading: governanceLoading } = useGovernance(profileId);

  return useMemo(() => {
    const loading = auditsLoading || governanceLoading;

    // Get latest audit score
    const { score: auditScore, grade: auditGrade } = getLatestAuditScore(audits);

    // Calculate data freshness
    const { freshness: dataFreshness, hours: hoursSinceSync } = calculateDataFreshness(options.lastSyncAt);

    // Build signals
    const signals: HealthSignals = {
      auditScore,
      auditGrade,
      newAnomalyCount: countNewAnomalies(options.anomalies),
      criticalAlertsCount: countAlertsByLevel(options.alerts, 'critical'),
      warningAlertsCount: countAlertsByLevel(options.alerts, 'warn'),
      automationPaused: settings?.automation_paused || false,
      enabledRulesCount: options.rules?.filter(r => r.enabled).length || 0,
      totalRulesCount: options.rules?.length || 0,
      dataFreshness,
      hoursSinceSync,
      acosVsTarget: options.currentAcos !== undefined && options.targetAcos !== undefined
        ? options.currentAcos - options.targetAcos
        : null,
      recentFailures: options.recentActionFailures || 0,
    };

    // Calculate weighted score
    const score = calculateHealthScore(signals);

    // Determine status based on score
    const status: HealthStatus = score >= 70 ? 'healthy' : score >= 40 ? 'watch' : 'at_risk';

    // Generate human-readable reasons
    const reasons = generateHealthReasons(signals, score);

    return { status, score, reasons, signals, loading };
  }, [audits, settings, options, auditsLoading, governanceLoading]);
}
