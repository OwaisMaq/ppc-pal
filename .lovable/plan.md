

## Complete the Automation Engine

The automation engine has strong backend infrastructure (rules engine, actions worker, governance, bid optimizer) but several UI and functional gaps prevent it from being fully usable. Here is what needs to be built:

---

### Gap Analysis

| Component | Status | Gap |
|---|---|---|
| Rules Engine (backend) | 90% | Missing `bid_down`, `bid_up`, `placement_opt` evaluators |
| Actions Worker (backend) | 95% | Solid - handles 15+ action types |
| Governance/Guardrails | 85% | Kill switch uses local state, not persisted |
| Custom Rule Creation | 0% | "Add Rule" button does nothing |
| Audit Log Tab | 0% | Placeholder "coming soon" |
| Tier-based entitlements | 40% | Hardcoded old plan logic in multiple places |
| Rule editing/deletion | 0% | No way to edit params or delete rules |

---

### Implementation Plan

#### 1. Custom Rule Creation Dialog
Create a `CreateRuleDialog` component that lets users create automation rules from the UI:
- Rule name, type selector (budget_depletion, spend_spike, st_harvest, st_prune, bid_down, bid_up)
- Dynamic parameter form based on selected type (thresholds, lookback windows, etc.)
- Mode selector (dry_run, suggestion, auto)
- Severity selector
- Throttle settings (cooldown hours, max actions/day)
- Calls the `rules-api/rules` POST endpoint

**Files:** Create `src/components/automation/CreateRuleDialog.tsx`

#### 2. Rule Editing and Deletion
- Add edit button to `AutomationRulesList` that opens CreateRuleDialog in edit mode
- Add delete button with confirmation
- Add PUT and DELETE handlers to `useAutomation` hook
- Update `rules-api` edge function to support PUT/DELETE on rules

**Files:** Update `src/components/AutomationRulesList.tsx`, `src/hooks/useAutomation.ts`, `supabase/functions/rules-api/index.ts`

#### 3. Audit Log Tab
Replace the "coming soon" placeholder with a real audit log showing:
- All rule runs from `automation_rule_runs` table with timestamps, status, alerts/actions counts
- All executed actions from `action_queue` with status, entity details, before/after metrics
- Filter by date range and action type
- Expandable rows showing full action details

**Files:** Create `src/components/automation/AuditLogTab.tsx`, update `src/pages/AutomationPage.tsx`

#### 4. Add Missing Rule Evaluators (bid_down, bid_up)
Add `evaluateBidDown` and `evaluateBidUp` methods to the `RuleEvaluator` class in `rules-engine-runner`:
- `bid_down`: Lower bids on high-ACOS keywords/targets (params: maxAcos, minClicks, lookbackDays, decreasePercent)
- `bid_up`: Raise bids on high-converting low-impression keywords (params: minConversions, maxAcos, minImpressions, increasePercent)
- Wire into the switch statement in the main handler

**Files:** Update `supabase/functions/rules-engine-runner/index.ts`

#### 5. Fix Kill Switch Persistence
The Governance page kill switch currently only sets local React state. Wire it to the `governance_settings.automation_paused` field via the existing `useGovernance` hook's `toggleAutomation` function.

**Files:** Update `src/pages/Governance.tsx`

#### 6. Update Tier Entitlements in Automation
Replace hardcoded plan checks in `AutomationRulesList` (`canAutoApply`), `AutomationPage` (`getPlanFeatures`), and `rules-engine-runner` (`checkEntitlements`) with the new four-tier system:
- Free: 0 rules allowed
- Starter: 5 rules, budget_depletion + spend_spike + st_harvest + st_prune
- Pro: unlimited rules, all types including bid_down/bid_up
- Agency: unlimited, all types

**Files:** Update `src/components/AutomationRulesList.tsx`, `src/pages/AutomationPage.tsx`, `supabase/functions/rules-engine-runner/index.ts`

---

### Files Summary

| File | Action |
|---|---|
| `src/components/automation/CreateRuleDialog.tsx` | Create |
| `src/components/automation/AuditLogTab.tsx` | Create |
| `src/components/automation/index.ts` | Update - add exports |
| `src/components/AutomationRulesList.tsx` | Update - add edit/delete, fix tier logic |
| `src/pages/AutomationPage.tsx` | Update - wire CreateRuleDialog, AuditLogTab, fix tier logic |
| `src/pages/Governance.tsx` | Update - fix kill switch persistence |
| `src/hooks/useAutomation.ts` | Update - add updateRule, deleteRule methods |
| `supabase/functions/rules-api/index.ts` | Update - add PUT/DELETE endpoints |
| `supabase/functions/rules-engine-runner/index.ts` | Update - add bid_down/bid_up evaluators, fix tier check |

