/**
 * Governance Checker - Shared utility for enforcing automation guardrails
 * Used by actions-worker, rules-engine-runner, and bayesian-bid-optimizer
 */

export interface GovernanceSettings {
  id: string;
  profile_id: string;
  max_bid_change_percent: number;
  min_bid_micros: number;
  max_bid_micros: number;
  daily_spend_cap_micros: number | null;
  monthly_spend_cap_micros: number | null;
  max_actions_per_day: number;
  require_approval_above_micros: number;
  automation_paused: boolean;
  automation_paused_at: string | null;
  automation_paused_reason: string | null;
}

export interface GovernanceCheck {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
}

export interface BidValidation {
  allowed: boolean;
  adjustedBidMicros?: number;
  reason?: string;
}

// Default settings if user hasn't configured governance
export const DEFAULT_GOVERNANCE: Omit<GovernanceSettings, 'id' | 'profile_id'> = {
  max_bid_change_percent: 20,
  min_bid_micros: 100000, // $0.10
  max_bid_micros: 10000000, // $10.00
  daily_spend_cap_micros: null,
  monthly_spend_cap_micros: null,
  max_actions_per_day: 100,
  require_approval_above_micros: 1000000, // $1.00
  automation_paused: false,
  automation_paused_at: null,
  automation_paused_reason: null,
};

// Cache for governance settings (per request)
const settingsCache = new Map<string, GovernanceSettings | null>();

/**
 * Get governance settings for a profile
 */
export async function getGovernanceSettings(
  supabase: any,
  profileId: string
): Promise<GovernanceSettings | null> {
  // Check cache first
  if (settingsCache.has(profileId)) {
    return settingsCache.get(profileId) ?? null;
  }

  const { data, error } = await supabase
    .from('governance_settings')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    console.error(`[Governance] Error fetching settings for profile ${profileId}:`, error);
    return null;
  }

  // Cache the result (even if null)
  settingsCache.set(profileId, data);
  return data;
}

/**
 * Get settings with defaults applied
 */
export async function getGovernanceWithDefaults(
  supabase: any,
  profileId: string
): Promise<GovernanceSettings> {
  const settings = await getGovernanceSettings(supabase, profileId);
  
  if (settings) {
    return settings;
  }
  
  // Return defaults if no settings exist
  return {
    id: '',
    profile_id: profileId,
    ...DEFAULT_GOVERNANCE,
  };
}

/**
 * Check if automation is paused for a profile (kill switch)
 */
export async function isAutomationPaused(
  supabase: any,
  profileId: string
): Promise<{ paused: boolean; reason?: string }> {
  const settings = await getGovernanceSettings(supabase, profileId);
  
  if (!settings) {
    return { paused: false };
  }
  
  if (settings.automation_paused) {
    return { 
      paused: true, 
      reason: settings.automation_paused_reason || 'Automation paused by user' 
    };
  }
  
  return { paused: false };
}

/**
 * Check if an entity is protected from automation
 */
export async function isEntityProtected(
  supabase: any,
  profileId: string,
  entityType: 'campaign' | 'ad_group' | 'keyword' | 'target',
  entityId: string
): Promise<{ protected: boolean; reason?: string }> {
  const { data, error } = await supabase
    .from('protected_entities')
    .select('reason')
    .eq('profile_id', profileId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .maybeSingle();

  if (error) {
    console.error(`[Governance] Error checking protected entity:`, error);
    return { protected: false };
  }

  if (data) {
    return { 
      protected: true, 
      reason: data.reason || `${entityType} is protected from automation` 
    };
  }

  return { protected: false };
}

/**
 * Validate a bid change against governance guardrails
 */
export async function validateBidChange(
  supabase: any,
  profileId: string,
  currentBidMicros: number,
  newBidMicros: number
): Promise<BidValidation> {
  const settings = await getGovernanceWithDefaults(supabase, profileId);
  
  // Check absolute limits
  if (newBidMicros < settings.min_bid_micros) {
    return {
      allowed: true,
      adjustedBidMicros: settings.min_bid_micros,
      reason: `Bid clamped to minimum $${(settings.min_bid_micros / 1000000).toFixed(2)}`
    };
  }
  
  if (newBidMicros > settings.max_bid_micros) {
    return {
      allowed: true,
      adjustedBidMicros: settings.max_bid_micros,
      reason: `Bid clamped to maximum $${(settings.max_bid_micros / 1000000).toFixed(2)}`
    };
  }
  
  // Check percentage change limit
  if (currentBidMicros > 0) {
    const changePercent = Math.abs(newBidMicros - currentBidMicros) / currentBidMicros * 100;
    
    if (changePercent > settings.max_bid_change_percent) {
      // Clamp to max allowed change
      const maxChange = currentBidMicros * (settings.max_bid_change_percent / 100);
      const direction = newBidMicros > currentBidMicros ? 1 : -1;
      const adjustedBid = Math.round(currentBidMicros + (direction * maxChange));
      
      // Ensure adjusted bid is still within absolute limits
      const finalBid = Math.max(
        settings.min_bid_micros, 
        Math.min(settings.max_bid_micros, adjustedBid)
      );
      
      return {
        allowed: true,
        adjustedBidMicros: finalBid,
        reason: `Bid change clamped to ${settings.max_bid_change_percent}% max (was ${changePercent.toFixed(0)}%)`
      };
    }
  }
  
  return { allowed: true };
}

/**
 * Check if the daily action quota has been reached
 */
export async function checkActionQuota(
  supabase: any,
  profileId: string
): Promise<GovernanceCheck> {
  const settings = await getGovernanceWithDefaults(supabase, profileId);
  
  // Get today's action count for this profile
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  
  const { count, error } = await supabase
    .from('action_queue')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('status', 'applied')
    .gte('applied_at', dayStart);

  if (error) {
    console.error(`[Governance] Error checking action quota:`, error);
    // Allow on error - don't block automation due to query issues
    return { allowed: true };
  }

  const currentCount = count || 0;
  
  if (currentCount >= settings.max_actions_per_day) {
    return {
      allowed: false,
      reason: `Daily action limit (${settings.max_actions_per_day}) reached for this profile`
    };
  }

  return { allowed: true };
}

/**
 * Check if an action requires manual approval based on impact threshold
 */
export async function requiresApproval(
  supabase: any,
  profileId: string,
  impactMicros: number
): Promise<boolean> {
  const settings = await getGovernanceWithDefaults(supabase, profileId);
  
  return impactMicros >= settings.require_approval_above_micros;
}

/**
 * Apply bid guardrails to a proposed bid
 * Returns the adjusted bid after applying all limits
 */
export async function applyBidGuardrails(
  supabase: any,
  profileId: string,
  currentBidMicros: number | null,
  proposedBidMicros: number
): Promise<{ bidMicros: number; wasAdjusted: boolean; reason?: string }> {
  const settings = await getGovernanceWithDefaults(supabase, profileId);
  
  let finalBid = proposedBidMicros;
  let wasAdjusted = false;
  let reason: string | undefined;
  
  // Apply absolute minimum
  if (finalBid < settings.min_bid_micros) {
    finalBid = settings.min_bid_micros;
    wasAdjusted = true;
    reason = `Bid raised to minimum $${(settings.min_bid_micros / 1000000).toFixed(2)}`;
  }
  
  // Apply absolute maximum
  if (finalBid > settings.max_bid_micros) {
    finalBid = settings.max_bid_micros;
    wasAdjusted = true;
    reason = `Bid capped to maximum $${(settings.max_bid_micros / 1000000).toFixed(2)}`;
  }
  
  // Apply percentage change limit if we have a current bid
  if (currentBidMicros && currentBidMicros > 0) {
    const changePercent = Math.abs(finalBid - currentBidMicros) / currentBidMicros * 100;
    
    if (changePercent > settings.max_bid_change_percent) {
      const maxChange = currentBidMicros * (settings.max_bid_change_percent / 100);
      const direction = finalBid > currentBidMicros ? 1 : -1;
      finalBid = Math.round(currentBidMicros + (direction * maxChange));
      
      // Re-apply absolute limits
      finalBid = Math.max(settings.min_bid_micros, Math.min(settings.max_bid_micros, finalBid));
      
      wasAdjusted = true;
      reason = `Bid change limited to ${settings.max_bid_change_percent}%`;
    }
  }
  
  return { bidMicros: finalBid, wasAdjusted, reason };
}

/**
 * Full governance check for an action
 * Combines all checks into one call
 */
export async function checkGovernanceForAction(
  supabase: any,
  profileId: string,
  entityType: 'campaign' | 'ad_group' | 'keyword' | 'target',
  entityId: string,
  actionType?: string,
  impactMicros?: number
): Promise<GovernanceCheck> {
  // Check kill switch first
  const pauseCheck = await isAutomationPaused(supabase, profileId);
  if (pauseCheck.paused) {
    return { 
      allowed: false, 
      reason: pauseCheck.reason 
    };
  }
  
  // Check if entity is protected
  const protectedCheck = await isEntityProtected(supabase, profileId, entityType, entityId);
  if (protectedCheck.protected) {
    return { 
      allowed: false, 
      reason: protectedCheck.reason 
    };
  }
  
  // Check daily quota
  const quotaCheck = await checkActionQuota(supabase, profileId);
  if (!quotaCheck.allowed) {
    return quotaCheck;
  }
  
  // Check if needs approval
  let needsApproval = false;
  if (impactMicros !== undefined) {
    needsApproval = await requiresApproval(supabase, profileId, impactMicros);
  }
  
  return { 
    allowed: true,
    requiresApproval: needsApproval
  };
}

/**
 * Clear the settings cache (call between batches if needed)
 */
export function clearGovernanceCache(): void {
  settingsCache.clear();
}
